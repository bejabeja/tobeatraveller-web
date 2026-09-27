import { z } from "zod";
import { vanLogCategories, supplyCategories, supplyUnits } from "./constants/constants.js";

// Messages here are translation keys (see validationMessages.js). Fields
// without one of their own get these instead of Zod's English defaults.
z.setErrorMap((issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_type && (issue.received === 'undefined' || issue.received === 'null')) {
        return { message: 'validation.required' };
    }
    if (issue.code === z.ZodIssueCode.too_small) {
        return { message: issue.minimum === 1 ? 'validation.required' : 'validation.tooShort' };
    }
    if (issue.code === z.ZodIssueCode.too_big) return { message: 'validation.tooLong' };
    if (issue.code === z.ZodIssueCode.invalid_string && issue.validation === 'email') return { message: 'validation.emailInvalid' };
    if (issue.code === z.ZodIssueCode.invalid_type || issue.code === z.ZodIssueCode.invalid_enum_value) return { message: 'validation.invalid' };
    return { message: ctx.defaultError };
});

// Single source of truth for itinerary/experience visibility defaults,
// shared by web and mobile create/edit screens.
export const NEW_ITINERARY_DEFAULT_VISIBILITY = false;
export const EXISTING_ITINERARY_VISIBILITY_FALLBACK = true;

export const updateUserSchema = z.object({
    username: z.string()
        .min(2, "validation.usernameMin")
        .max(50, "validation.usernameMax")
        .regex(/^\S+$/, "validation.usernameNoSpaces"),
    location: z.string()
        .max(50, "validation.tooLong")
        .nullable(),
    name: z
        .string()
        .max(50, "validation.tooLong")
        .nullable(),

    about: z
        .string()
        .max(1000, "validation.tooLong")
        .nullable(),

    bio: z
        .string()
        .max(160, "validation.tooLong")
        .nullable(),
});

export const signupSchema = z.object({
    email: z
        .string()
        .email("validation.emailInvalid")
        .min(1, "validation.emailRequired"),
    username: z.string()
        .min(2, "validation.usernameMin")
        .max(50, "validation.usernameMax")
        .regex(/^\S+$/, "validation.usernameNoSpaces"),
    password: z.string()
        .min(6, "validation.passwordMin")
        .refine((password) => password.trim().length >= 6, "validation.passwordMin"),
    confirmPassword: z.string(),
    // Optional; a code is its owner's username, so it's at most as long.
    referralCode: z.string().trim().max(50, "validation.tooLong").optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordsMismatch",
    path: ["confirmPassword"],
});

export const loginSchema = z.object({
    email: z.string().email("validation.emailInvalid").min(1, "validation.emailRequired"),
    password: z.string().min(6, "validation.passwordMin"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("validation.emailInvalid").min(1, "validation.emailRequired"),
});

export const resetPasswordSchema = z.object({
    newPassword: z.string()
        .min(6, "validation.passwordMin")
        .refine((password) => password.trim().length >= 6, "validation.passwordMin"),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "validation.passwordsMismatch",
    path: ["confirmPassword"],
});

export const createItinerarySchema = z
    .object({
        imageUrl: z.string().optional(),
        title: z
            .string()
            .min(2, "validation.titleRequired")
            .max(50, "validation.tooLong"),

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
            .max(500, "validation.tooLong")
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
                        .max(500, "validation.tooLong")
                        .optional()
                        .or(z.literal("other")),

                    category: z
                        .string()
                        .optional(),

                    infoPlace: z.object({
                        name: z.string().min(1, "validation.placeFromList"),
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
            .max(3, "validation.currencyInvalid")
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
        message: "validation.endBeforeStart",
        path: ["endDate"],
    })
    .refine((data) => data.destination.name && data.destination.label, {
        message: "validation.destinationFromList",
        path: ["destination"]
    })
    ;

export const CONTACT_NAME_MAX_LENGTH = 100;
export const CONTACT_SUBJECT_MAX_LENGTH = 150;
export const CONTACT_MESSAGE_MAX_LENGTH = 1000;

export const contactSchema = z.object({
    name: z.string().min(2, "validation.nameMin").max(CONTACT_NAME_MAX_LENGTH, "validation.tooLong"),
    email: z.string().email("validation.emailInvalid"),
    subject: z.string().min(2, "validation.subjectMin").max(CONTACT_SUBJECT_MAX_LENGTH, "validation.tooLong"),
    message: z.string().min(10, "validation.messageMin").max(CONTACT_MESSAGE_MAX_LENGTH, "validation.tooLong"),
});

const VAN_LOG_CATEGORY_VALUES = vanLogCategories.map(c => c.value);

export const vanLogEntrySchema = z.object({
    category: z.enum(VAN_LOG_CATEGORY_VALUES, { errorMap: () => ({ message: "validation.chooseCategory" }) }),
    title: z.string().max(255, "validation.tooLong").optional().or(z.literal("")),
    amount: z.string()
        .optional()
        .transform(val => (val && !isNaN(Number(val)) ? parseFloat(val) : null)),
    currency: z.string().max(3, "validation.currencyInvalid").optional().or(z.literal("")),
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
    notes: z.string().max(1000, "validation.tooLong").optional().or(z.literal("")),
    entryDate: z.string().min(1, "validation.dateRequired"),
}).refine((data) => data.category === 'fuel' || data.pricePerLiter == null, {
    message: "validation.pricePerLiterFuelOnly",
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
    entryDate: z.string().min(1, "validation.dateRequired"),
    bestMoment: z.string().max(500, "validation.tooLong").optional().or(z.literal("")),
    lessonLearned: z.string().max(500, "validation.tooLong").optional().or(z.literal("")),
    memories: z.string().max(3000, "validation.tooLong").optional().or(z.literal("")),
    peopleMet: z.string().max(500, "validation.tooLong").optional().or(z.literal("")),
    wouldReturn: z.boolean().nullable().optional(),
});

const SUPPLY_CATEGORY_VALUES = supplyCategories.map(c => c.value);
const SUPPLY_UNIT_VALUES = supplyUnits.map(u => u.value);
const SUPPLY_WHOLE_UNITS = supplyUnits.filter(u => !u.allowsDecimals).map(u => u.value);

export const supplyItemSchema = z.object({
    name: z.string().min(1, "validation.nameRequired").max(255, "validation.tooLong"),
    category: z.enum(SUPPLY_CATEGORY_VALUES, { errorMap: () => ({ message: "validation.chooseCategory" }) }),
    amount: z.string()
        .min(1, "validation.amountRequired")
        .refine(val => !isNaN(Number(val)) && Number(val) > 0, "validation.amountPositive")
        .transform(val => parseFloat(val)),
    unit: z.enum(SUPPLY_UNIT_VALUES, { errorMap: () => ({ message: "validation.chooseUnit" }) }),
    notes: z.string().max(500, "validation.tooLong").optional().or(z.literal("")),
}).refine(data => !SUPPLY_WHOLE_UNITS.includes(data.unit) || Number.isInteger(data.amount), {
    message: "validation.unitNoDecimals",
    path: ["amount"],
});