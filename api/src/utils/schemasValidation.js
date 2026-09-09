import { z } from "zod";
import { VAN_LOG_CATEGORIES } from "../models/vanLogEntry.js";
import { SUPPLY_CATEGORIES, SUPPLY_UNITS, SUPPLY_WHOLE_UNITS } from "./supplyConstants.js";
import { PACKING_CATEGORIES } from "./packingConstants.js";
import { ROLES } from "./roles.js";

export const updateUserRoleSchema = z.object({
    role: z.enum([ROLES.USER, ROLES.ADMIN, ROLES.SUPERADMIN]),
});

export const updateUserTierSchema = z.object({
    tier: z.enum(['free', 'premium']),
});

export const createCheckoutSessionSchema = z.object({
    plan: z.enum(['monthly', 'annual']),
});

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
    username: z.string()
        .min(2, "Username is required")
        .max(50, "Username must be less than 50 characters")
        .regex(/^\S+$/, "Username cannot contain spaces"),
    email: z
        .string()
        .email("Invalid email address")
        .min(1, "Email is required"),
    password: z.string()
        .min(6, "Password must be at least 6 characters long")
        .refine((password) => password.trim().length >= 6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
    location: z.string().max(50, "No valid location").optional().or(z.literal("")),
    termsAccepted: z.literal(true, {
        errorMap: () => ({ message: "You must accept the Terms of Service and Privacy Policy" }),
    }),
    ageConfirmed: z.literal(true, {
        errorMap: () => ({ message: "You must confirm you are at least 16 years old" }),
    }),
}).refine((data) => {
    return data.password === data.confirmPassword;
}, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address").min(1, "Email is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(64),
    newPassword: z.string()
        .min(6)
        .refine((password) => password.trim().length >= 6, "Password must be at least 6 characters"),
});

// Keep in sync with shared/src/utils/schemasValidation.js's contactSchema and
// shared/src/utils/constants/constants.js#MAX_COMMENT_LENGTH (api/ has no dependency on
// shared/, so these limits are duplicated by necessity, not oversight).
const CONTACT_NAME_MAX_LENGTH = 100;
const CONTACT_SUBJECT_MAX_LENGTH = 150;
const CONTACT_MESSAGE_MAX_LENGTH = 1000;
const COMMENT_MAX_LENGTH = 500;

export const contactSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(CONTACT_NAME_MAX_LENGTH, `Name must be less than ${CONTACT_NAME_MAX_LENGTH} characters`),
    email: z.string().email("Invalid email address"),
    subject: z.string().min(2, "Subject must be at least 2 characters").max(CONTACT_SUBJECT_MAX_LENGTH, `Subject must be less than ${CONTACT_SUBJECT_MAX_LENGTH} characters`),
    message: z.string().min(10, "Message must be at least 10 characters").max(CONTACT_MESSAGE_MAX_LENGTH, `Message must be less than ${CONTACT_MESSAGE_MAX_LENGTH} characters`),
});

export const commentSchema = z.object({
    text: z.string().min(1, "Comment cannot be empty").max(COMMENT_MAX_LENGTH, `Comment must be at most ${COMMENT_MAX_LENGTH} characters`),
});

const vanLogLocationSchema = z.object({
    name: z.string().max(255).nullable().optional(),
    country: z.string().max(255).nullable().optional(),
    label: z.string().max(500).nullable().optional(),
    lat: z.number().nullable().optional(),
    lon: z.number().nullable().optional(),
}).nullable().optional();

export const vanLogEntrySchema = z.object({
    category: z.enum(VAN_LOG_CATEGORIES, { errorMap: () => ({ message: "Invalid category" }) }),
    title: z.string().max(255, "Title must be less than 255 characters").nullable().optional(),
    amount: z.number().nonnegative("Amount cannot be negative").nullable().optional(),
    currency: z.string().length(3, "Currency must be a 3-letter code").nullable().optional(),
    pricePerLiter: z.number().positive("Price per liter must be greater than zero").nullable().optional(),
    location: vanLogLocationSchema,
    notes: z.string().max(1000, "Notes must be less than 1000 characters").nullable().optional(),
    entryDate: z.string().min(1, "Date is required"),
}).refine((data) => data.category === 'fuel' || data.pricePerLiter == null, {
    message: "Price per liter only applies to the fuel category",
    path: ["pricePerLiter"],
});

export const lifeDiaryEntrySchema = z.object({
    location: vanLogLocationSchema,
    entryDate: z.string().min(1, "Date is required"),
    bestMoment: z.string().max(500, "Best moment must be less than 500 characters").nullable().optional(),
    lessonLearned: z.string().max(500, "Lesson learned must be less than 500 characters").nullable().optional(),
    memories: z.string().max(3000, "Memories must be less than 3000 characters").nullable().optional(),
    peopleMet: z.string().max(500, "People met must be less than 500 characters").nullable().optional(),
    wouldReturn: z.boolean().nullable().optional(),
    keepImageIds: z.array(z.string()).optional(),
});

export const supplyItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
    category: z.enum(SUPPLY_CATEGORIES, { errorMap: () => ({ message: "Invalid category" }) }).optional().default('other'),
    amount: z.number().positive("Amount must be greater than zero"),
    unit: z.enum(SUPPLY_UNITS, { errorMap: () => ({ message: "Invalid unit" }) }),
    notes: z.string().max(500, "Notes must be less than 500 characters").nullable().optional(),
}).refine(data => !SUPPLY_WHOLE_UNITS.includes(data.unit) || Number.isInteger(data.amount), {
    message: "This unit can't have decimals",
    path: ["amount"],
});

export const purchaseAmountSchema = z.object({
    purchasedAmount: z.number().positive("Purchased amount must be greater than zero").optional(),
});

export const consumeAmountSchema = z.object({
    consumedAmount: z.number().positive("Consumed amount must be greater than zero").optional(),
});

export const packingItemSchema = z.object({
    category: z.enum(PACKING_CATEGORIES, { errorMap: () => ({ message: "Invalid category" }) }),
    name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
    checked: z.boolean().optional(),
});

export const packingSeedSchema = z.object({
    items: z.array(z.object({
        category: z.enum(PACKING_CATEGORIES, { errorMap: () => ({ message: "Invalid category" }) }),
        name: z.string().min(1).max(255),
    })).min(1, "At least one item is required").max(200, "Too many items"),
});
