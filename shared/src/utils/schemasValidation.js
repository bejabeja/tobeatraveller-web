import { z } from "zod";
import { vanLogCategories, supplyCategories, supplyUnits } from "./constants/constants.js";

// Single source of truth for itinerary/experience visibility defaults,
// shared by web and mobile create/edit screens.
export const NEW_ITINERARY_DEFAULT_VISIBILITY = false;
export const EXISTING_ITINERARY_VISIBILITY_FALLBACK = true;

export const updateUserSchema = z.object({
    username: z.string()
        .min(2, "Username is required")
        .max(50, "Username must be less than 50 characters")
        .regex(/^\S+$/, "Username cannot contain spaces"),
    location: z.string()
        .max(50, "No valid location")
        .nullable(),
    name: z
        .string()
        .max(50, "Max 50 characters")
        .nullable(),

    about: z
        .string()
        .max(1000, "Max 1000 characters")
        .nullable(),

    bio: z
        .string()
        .max(160, "Max 160 characters")
        .nullable(),
});

export const signupSchema = z.object({
    email: z
        .string()
        .email("Invalid email address")
        .min(1, "Email is required"),
    username: z.string()
        .min(2, "Username must be at least 2 characters")
        .max(50, "Username must be less than 50 characters")
        .regex(/^\S+$/, "Username cannot contain spaces"),
    password: z.string()
        .min(6, "Password must be at least 6 characters")
        .refine((password) => password.trim().length >= 6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    // Optional; a code is its owner's username, so it's at most as long.
    referralCode: z.string().trim().max(50, "Invite code must be at most 50 characters").optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address").min(1, "Email is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address").min(1, "Email is required"),
});

export const resetPasswordSchema = z.object({
    newPassword: z.string()
        .min(6, "Password must be at least 6 characters")
        .refine((password) => password.trim().length >= 6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const createItinerarySchema = z
    .object({
        imageUrl: z.string().optional(),
        title: z
            .string()
            .min(2, "Title is required")
            .max(50, "Title must be less than 50 characters"),

        destination: z
            .object({
                name: z.string(),
                label: z.string(),
                coordinates: z.object({
                    lat: z.number(),
                    lon: z.number(),
                }),
            }),

        description: z
            .string()
            .max(500, "Description must be less than 500 characters")
            .optional(),

        startDate: z
            .string(),

        endDate: z
            .string(),

        places: z
            .array(
                z.object({
                    id: z.string().uuid().optional(),

                    dayNumber: z.number().int().min(1).default(1),

                    description: z
                        .string()
                        .max(500, "Description must be less than 500 characters")
                        .optional()
                        .or(z.literal("other")),

                    category: z
                        .string()
                        .optional(),

                    infoPlace: z.object({
                        name: z.string().min(1, "Please select a valid place from the list"),
                        label: z.string().optional(),
                        coordinates: z.object({
                            lat: z.number(),
                            lon: z.number(),
                        }).optional(),
                    }),
                })
            ).optional(),

        budget: z
            .string()
            .optional()
            .transform(val => (val && !isNaN(Number(val)) ? parseFloat(val) : null)),

        currency: z
            .string()
            .max(3, "Currency code too long")
            .optional()
            .default(""),

        numberOfTravellers: z
            .string()
            .optional()
            .transform(val => (val && !isNaN(Number(val)) ? parseInt(val, 10) : 1)),

        category: z
            .string(),

        isPublic: z.boolean().default(EXISTING_ITINERARY_VISIBILITY_FALLBACK),
    })
    .refine((data) => data.endDate >= data.startDate, {
        message: "End date must be after or equal to start date",
        path: ["endDate"],
    })
    .refine((data) => data.destination.name && data.destination.label, {
        message: "Please select a valid destination from the list",
        path: ["destination"]
    })
    ;

export const CONTACT_NAME_MAX_LENGTH = 100;
export const CONTACT_SUBJECT_MAX_LENGTH = 150;
export const CONTACT_MESSAGE_MAX_LENGTH = 1000;

export const contactSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(CONTACT_NAME_MAX_LENGTH, `Name must be less than ${CONTACT_NAME_MAX_LENGTH} characters`),
    email: z.string().email("Invalid email address"),
    subject: z.string().min(2, "Subject must be at least 2 characters").max(CONTACT_SUBJECT_MAX_LENGTH, `Subject must be less than ${CONTACT_SUBJECT_MAX_LENGTH} characters`),
    message: z.string().min(10, "Message must be at least 10 characters").max(CONTACT_MESSAGE_MAX_LENGTH, `Message must be less than ${CONTACT_MESSAGE_MAX_LENGTH} characters`),
});

const VAN_LOG_CATEGORY_VALUES = vanLogCategories.map(c => c.value);

export const vanLogEntrySchema = z.object({
    category: z.enum(VAN_LOG_CATEGORY_VALUES, { errorMap: () => ({ message: "Please choose a category" }) }),
    title: z.string().max(255, "Title must be less than 255 characters").optional().or(z.literal("")),
    amount: z.string()
        .optional()
        .transform(val => (val && !isNaN(Number(val)) ? parseFloat(val) : null)),
    currency: z.string().max(3, "Currency code too long").optional().or(z.literal("")),
    pricePerLiter: z.string()
        .optional()
        .transform(val => (val && !isNaN(Number(val)) ? parseFloat(val) : null)),
    location: z.object({
        name: z.string().optional(),
        country: z.string().optional(),
        label: z.string().optional(),
        coordinates: z.object({
            lat: z.number(),
            lon: z.number(),
        }).optional(),
    }).optional(),
    notes: z.string().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal("")),
    entryDate: z.string().min(1, "Date is required"),
}).refine((data) => data.category === 'fuel' || data.pricePerLiter == null, {
    message: "Price per liter only applies to the fuel category",
    path: ["pricePerLiter"],
});

export const lifeDiaryEntrySchema = z.object({
    location: z.object({
        name: z.string().optional(),
        country: z.string().optional(),
        label: z.string().optional(),
        coordinates: z.object({
            lat: z.number(),
            lon: z.number(),
        }).optional(),
    }).optional(),
    entryDate: z.string().min(1, "Date is required"),
    bestMoment: z.string().max(500, "Best moment must be less than 500 characters").optional().or(z.literal("")),
    lessonLearned: z.string().max(500, "Lesson learned must be less than 500 characters").optional().or(z.literal("")),
    memories: z.string().max(3000, "Memories must be less than 3000 characters").optional().or(z.literal("")),
    peopleMet: z.string().max(500, "People met must be less than 500 characters").optional().or(z.literal("")),
    wouldReturn: z.boolean().nullable().optional(),
});

const SUPPLY_CATEGORY_VALUES = supplyCategories.map(c => c.value);
const SUPPLY_UNIT_VALUES = supplyUnits.map(u => u.value);
const SUPPLY_WHOLE_UNITS = supplyUnits.filter(u => !u.allowsDecimals).map(u => u.value);

export const supplyItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
    category: z.enum(SUPPLY_CATEGORY_VALUES, { errorMap: () => ({ message: "Please choose a category" }) }),
    amount: z.string()
        .min(1, "Amount is required")
        .refine(val => !isNaN(Number(val)) && Number(val) > 0, "Amount must be greater than zero")
        .transform(val => parseFloat(val)),
    unit: z.enum(SUPPLY_UNIT_VALUES, { errorMap: () => ({ message: "Please choose a unit" }) }),
    notes: z.string().max(500, "Notes must be less than 500 characters").optional().or(z.literal("")),
}).refine(data => !SUPPLY_WHOLE_UNITS.includes(data.unit) || Number.isInteger(data.amount), {
    message: "This unit can't have decimals",
    path: ["amount"],
});