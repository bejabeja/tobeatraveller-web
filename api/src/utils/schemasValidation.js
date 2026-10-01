import { z } from "zod";
import { VAN_LOG_CATEGORIES } from "../models/vanLogEntry.js";
import { SUPPLY_CATEGORIES, SUPPLY_UNITS, SUPPLY_WHOLE_UNITS } from "./supplyConstants.js";
import { PACKING_CATEGORIES } from "./packingConstants.js";
import { ROLES } from "./roles.js";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "./languages.js";
import { TRAVEL_STYLES } from "./travelStyles.js";
import { ISO_COUNTRY_CODES } from "./countryCodes.js";
import { EXPERIENCE_MAX_DAYS, ITINERARY_SOURCES } from "./itinerarySources.js";

// Messages a person can run into are the translation keys the apps share
// (`validation.*` in shared/src/locales), shown in their language; checks
// only another program can trip keep plain English. Fields without a message
// of their own get these instead of Zod's English defaults.
z.setErrorMap((issue, ctx) => {
    if (issue.code === z.ZodIssueCode.invalid_type && (issue.received === "undefined" || issue.received === "null")) {
        return { message: "validation.required" };
    }
    if (issue.code === z.ZodIssueCode.too_small) {
        return { message: issue.minimum === 1 ? "validation.required" : "validation.tooShort" };
    }
    if (issue.code === z.ZodIssueCode.too_big) return { message: "validation.tooLong" };
    if (issue.code === z.ZodIssueCode.invalid_string && issue.validation === "email") return { message: "validation.emailInvalid" };
    if (issue.code === z.ZodIssueCode.invalid_type || issue.code === z.ZodIssueCode.invalid_enum_value) return { message: "validation.invalid" };
    return { message: ctx.defaultError };
});

const PUSH_PLATFORMS = ["ios", "android"];
// Matches push_tokens.token VARCHAR(255).
const PUSH_TOKEN_MAX_LENGTH = 255;

export const updateUserRoleSchema = z.object({
    role: z.enum([ROLES.USER, ROLES.ADMIN, ROLES.SUPERADMIN]),
});

// How long staff can gift premium for; left out, it doesn't expire.
const MANUAL_PREMIUM_MONTHS = [1, 3, 12];

export const updateUserTierSchema = z.object({
    tier: z.enum(['free', 'premium']),
    months: z.number().int().refine((months) => MANUAL_PREMIUM_MONTHS.includes(months), "Invalid premium duration").nullish(),
}).refine(({ tier, months }) => tier === 'premium' || months == null, "Only premium takes a duration");

export const createCheckoutSessionSchema = z.object({
    plan: z.enum(['monthly', 'annual']),
    startTrial: z.boolean().default(true),
});

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

// A password shorter than this is guessed in minutes. Sign-in has no minimum, so
// that accounts made when it was 6 can still get in.
// Keep in sync with shared/src/utils/schemasValidation.js (api/ has no dependency on shared/).
const PASSWORD_MIN_LENGTH = 8;

export const signupSchema = z.object({
    username: z.string()
        .min(2, "validation.usernameMin")
        .max(50, "validation.usernameMax")
        .regex(/^\S+$/, "validation.usernameNoSpaces"),
    email: z
        .string()
        .email("validation.emailInvalid")
        .min(1, "validation.emailRequired"),
    password: z.string()
        .min(PASSWORD_MIN_LENGTH, "validation.passwordMin")
        .refine((password) => password.trim().length >= PASSWORD_MIN_LENGTH, "validation.passwordMin"),
    confirmPassword: z.string(),
    location: z.string().max(50, "validation.tooLong").optional().or(z.literal("")),
    termsAccepted: z.literal(true, {
        errorMap: () => ({ message: "validation.termsRequired" }),
    }),
    ageConfirmed: z.literal(true, {
        errorMap: () => ({ message: "validation.ageRequired" }),
    }),
    // A code is its owner's username (see ReferralService.codeFromUsername),
    // so it can be as long as one.
    referralCode: z.string().trim().max(50).optional().or(z.literal("")),
    // The app's language when signing up, for the welcome email and the
    // ones after it.
    language: z.enum(SUPPORTED_LANGUAGES).optional(),
}).refine((data) => {
    return data.password === data.confirmPassword;
}, {
    message: "validation.passwordsMismatch",
    path: ["confirmPassword"],
});

export const loginSchema = z.object({
    email: z.string().email("validation.emailInvalid").min(1, "validation.emailRequired"),
    password: z.string().min(1, "validation.passwordRequired"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(64),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(64),
    newPassword: z.string()
        .min(PASSWORD_MIN_LENGTH, "validation.passwordMin")
        .refine((password) => password.trim().length >= PASSWORD_MIN_LENGTH, "validation.passwordMin"),
});

// Keep in sync with shared/src/utils/constants/constants.js#itineraryCategories and
// #placeCategories (api/ has no dependency on shared/, so these are duplicated by
// necessity, not oversight).
const ITINERARY_CATEGORIES = [
    "adventure", "relax", "culture", "romantic", "roadtrip", "family",
    "backpacking", "wellness", "gastronomic", "party", "sport", "other",
];
const PLACE_CATEGORIES = [
    "transport", "flight", "accommodation", "activity", "local_tip",
    "nature", "beach", "city", "park", "monument", "camping", "island",
    "sport", "vineyard", "other",
];

const itineraryLocationSchema = z.object({
    name: z.string().min(1, "validation.destinationFromList"),
    label: z.string().nullable().optional(),
    lat: z.number(),
    lon: z.number(),
});

const itineraryPlaceSchema = z.object({
    id: z.string().uuid().optional(),
    description: z.string().max(500, "validation.tooLong").nullable().optional(),
    category: z.enum(PLACE_CATEGORIES, { errorMap: () => ({ message: "validation.chooseCategory" }) }).nullable().optional().default("other"),
    orderIndex: z.number().int().nonnegative(),
    dayNumber: z.number().int().min(1).nullable().optional().transform((value) => value ?? 1),
    infoPlace: z.object({
        name: z.string().min(1, "validation.placeFromList"),
        label: z.string().nullable().optional(),
        lat: z.number(),
        lon: z.number(),
    }),
});

const itineraryBudgetSchema = z.union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((value) => {
        if (value === null || value === undefined || value === "") return null;
        const parsed = typeof value === "number" ? value : parseFloat(value);
        return Number.isNaN(parsed) ? null : parsed;
    });

const itineraryDataFields = {
    title: z.string().min(2, "validation.titleRequired").max(255, "validation.tooLong"),
    description: z.string().max(500, "validation.tooLong").nullable().optional(),
    location: itineraryLocationSchema,
    startDate: z.string().min(1, "validation.dateRequired").nullable().optional(),
    endDate: z.string().min(1, "validation.dateRequired").nullable().optional(),
    // How long a trip without dates lasts; a dated one's comes from its dates.
    totalDays: z.number().int().min(1).max(EXPERIENCE_MAX_DAYS).optional(),
    numberOfPeople: z.number().int().positive("validation.travellersMin"),
    budget: itineraryBudgetSchema,
    currency: z.string().max(3, "validation.currencyInvalid").nullable().optional(),
    category: z.enum(ITINERARY_CATEGORIES, { errorMap: () => ({ message: "validation.chooseCategory" }) }),
    isPublic: z.boolean().optional(),
    places: z.array(itineraryPlaceSchema).optional().default([]),
};

// Either both dates, the end not before the start, or none and how many days
// it lasts (only an experience may go without dates; the service checks
// that on update, where the source isn't sent).
const validateItineraryDates = (data, context) => {
    if (data.startDate && data.endDate) {
        if (data.endDate < data.startDate) context.addIssue({ code: z.ZodIssueCode.custom, message: "validation.endBeforeStart", path: ["endDate"] });
        return;
    }
    if (data.startDate || data.endDate || !data.totalDays) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "validation.dateRequired", path: [data.startDate ? "endDate" : "startDate"] });
    }
};

export const createItineraryDataSchema = z.object({
    ...itineraryDataFields,
    source: z.enum([ITINERARY_SOURCES.ITINERARY, ITINERARY_SOURCES.EXPERIENCE]).optional(),
})
    .superRefine(validateItineraryDates)
    .refine((data) => data.startDate || data.source === ITINERARY_SOURCES.EXPERIENCE, { message: "validation.dateRequired", path: ["startDate"] });

export const updateItineraryDataSchema = z.object({
    ...itineraryDataFields,
    keepImageIds: z.array(z.string()).optional(),
}).superRefine(validateItineraryDates);

// Keep in sync with shared/src/utils/schemasValidation.js's contactSchema and
// shared/src/utils/constants/constants.js#MAX_COMMENT_LENGTH (api/ has no dependency on
// shared/, so these limits are duplicated by necessity, not oversight).
const CONTACT_NAME_MAX_LENGTH = 100;
const CONTACT_SUBJECT_MAX_LENGTH = 150;
const CONTACT_MESSAGE_MAX_LENGTH = 1000;
const CONTACT_REASONS = ["payment", "account", "bug", "idea", "feedback", "other"];
const COMMENT_MAX_LENGTH = 500;

export const contactSchema = z.object({
    name: z.string().min(2, "validation.nameMin").max(CONTACT_NAME_MAX_LENGTH, "validation.tooLong"),
    email: z.string().email("validation.emailInvalid"),
    reason: z.enum(CONTACT_REASONS, { message: "validation.reasonRequired" }),
    subject: z.string().min(2, "validation.subjectMin").max(CONTACT_SUBJECT_MAX_LENGTH, "validation.tooLong"),
    message: z.string().min(10, "validation.messageMin").max(CONTACT_MESSAGE_MAX_LENGTH, "validation.tooLong"),
    // For the confirmation sent back: the form can be sent without an account.
    language: z.enum(SUPPORTED_LANGUAGES).optional(),
});

// Keep in sync with shared/src/utils/schemasValidation.js's adminNoticeSchema.
const ADMIN_NOTICE_MAX_LENGTH = 500;

export const adminNoticeSchema = z.object({
    message: z.string().min(3, "validation.messageMin").max(ADMIN_NOTICE_MAX_LENGTH, "validation.tooLong"),
});

export const updateLanguageSchema = z.object({
    language: z.enum(SUPPORTED_LANGUAGES, { errorMap: () => ({ message: "validation.invalid" }) }),
});

export const updateTravelStyleSchema = z.object({
    travelStyle: z.enum(TRAVEL_STYLES, { errorMap: () => ({ message: "validation.invalid" }) }),
});

export const commentSchema = z.object({
    text: z.string().min(1, "validation.commentEmpty").max(COMMENT_MAX_LENGTH, "validation.tooLong"),
});

export const userIdParamSchema = z.string().uuid("Invalid user id");

const ISO_COUNTRY_CODE_SET = new Set(ISO_COUNTRY_CODES);

export const declaredCountriesSchema = z.object({
    countries: z.array(
        z.string().transform(code => code.toUpperCase()).refine(code => ISO_COUNTRY_CODE_SET.has(code), "Unknown country")
    ).max(ISO_COUNTRY_CODES.length, "Too many countries"),
});

export const PASSPORT_PUBLIC_VIEW = 'public';
export const passportQuerySchema = z.object({
    view: z.literal(PASSPORT_PUBLIC_VIEW, { errorMap: () => ({ message: "Invalid passport view" }) }).optional(),
});

// Offline mobile clients generate the id of what they create, so replaying a
// create whose response was lost returns the existing row instead of a duplicate.
const clientGeneratedIdField = { id: z.string().uuid("Invalid id").optional() };

const vanLogLocationSchema = z.object({
    name: z.string().max(255).nullable().optional(),
    country: z.string().max(255).nullable().optional(),
    label: z.string().max(500).nullable().optional(),
    lat: z.number().nullable().optional(),
    lon: z.number().nullable().optional(),
}).nullable().optional();

const vanLogEntryFields = z.object({
    category: z.enum(VAN_LOG_CATEGORIES, { errorMap: () => ({ message: "validation.chooseCategory" }) }),
    title: z.string().max(255, "validation.tooLong").nullable().optional(),
    amount: z.number().nonnegative("validation.amountNotNegative").nullable().optional(),
    currency: z.string().length(3, "validation.currencyInvalid").nullable().optional(),
    pricePerLiter: z.number().positive("validation.pricePositive").nullable().optional(),
    location: vanLogLocationSchema,
    notes: z.string().max(1000, "validation.tooLong").nullable().optional(),
    entryDate: z.string().min(1, "validation.dateRequired"),
    // The trip it's for, if any; null takes it off its trip.
    itineraryId: z.string().uuid("validation.invalid").nullable().optional(),
});

const withPricePerLiterOnlyForFuel = (schema) => schema.refine(
    (data) => data.category === 'fuel' || data.pricePerLiter == null,
    { message: "validation.pricePerLiterFuelOnly", path: ["pricePerLiter"] }
);

export const vanLogEntrySchema = withPricePerLiterOnlyForFuel(vanLogEntryFields);
export const createVanLogEntrySchema = withPricePerLiterOnlyForFuel(vanLogEntryFields.extend(clientGeneratedIdField));

export const lifeDiaryEntrySchema = z.object({
    location: vanLogLocationSchema,
    entryDate: z.string().min(1, "validation.dateRequired"),
    bestMoment: z.string().max(500, "validation.tooLong").nullable().optional(),
    lessonLearned: z.string().max(500, "validation.tooLong").nullable().optional(),
    memories: z.string().max(3000, "validation.tooLong").nullable().optional(),
    peopleMet: z.string().max(500, "validation.tooLong").nullable().optional(),
    wouldReturn: z.boolean().nullable().optional(),
    keepImageIds: z.array(z.string()).optional(),
});

export const createLifeDiaryEntrySchema = lifeDiaryEntrySchema.extend(clientGeneratedIdField);

const supplyItemFields = z.object({
    name: z.string().min(1, "validation.nameRequired").max(255, "validation.tooLong"),
    category: z.enum(SUPPLY_CATEGORIES, { errorMap: () => ({ message: "validation.chooseCategory" }) }).optional().default('other'),
    amount: z.number().positive("validation.amountPositive"),
    unit: z.enum(SUPPLY_UNITS, { errorMap: () => ({ message: "validation.chooseUnit" }) }),
    notes: z.string().max(500, "validation.tooLong").nullable().optional(),
});

const withWholeUnitsAsIntegers = (schema) => schema.refine(
    data => !SUPPLY_WHOLE_UNITS.includes(data.unit) || Number.isInteger(data.amount),
    { message: "validation.unitNoDecimals", path: ["amount"] }
);

export const supplyItemSchema = withWholeUnitsAsIntegers(supplyItemFields);
export const createSupplyItemSchema = withWholeUnitsAsIntegers(supplyItemFields.extend(clientGeneratedIdField));

export const purchaseAmountSchema = z.object({
    purchasedAmount: z.number().positive("validation.amountPositive").optional(),
});

export const consumeAmountSchema = z.object({
    consumedAmount: z.number().positive("validation.amountPositive").optional(),
});

// How many of one thing a list can ask for; more is a typo, not a plan.
const PACKING_ITEM_MAX_QUANTITY = 99;

export const packingItemSchema = z.object({
    category: z.enum(PACKING_CATEGORIES, { errorMap: () => ({ message: "validation.chooseCategory" }) }),
    name: z.string().trim().min(1, "validation.nameRequired").max(255, "validation.tooLong"),
    quantity: z.number().int().min(1, "validation.amountPositive").max(PACKING_ITEM_MAX_QUANTITY, "validation.tooLong").nullable().optional(),
    checked: z.boolean().optional(),
    position: z.number().int().min(1).optional(),
});

export const createPackingItemSchema = packingItemSchema.extend(clientGeneratedIdField);

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "validation.currentPasswordRequired"),
    newPassword: z.string()
        .min(PASSWORD_MIN_LENGTH, "validation.passwordMin")
        .refine((password) => password.trim().length >= PASSWORD_MIN_LENGTH, "validation.passwordMin"),
}).refine((data) => data.currentPassword !== data.newPassword, {
    message: "validation.passwordSameAsCurrent",
    path: ["newPassword"],
});

export const updateNotificationPreferencesSchema = z.object({
    notifyOnComment: z.boolean().optional(),
    notifyOnLike: z.boolean().optional(),
    notifyOnFollow: z.boolean().optional(),
    notifyOnFriendStamps: z.boolean().optional(),
    notifyOnTripReminders: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
    message: "At least one preference must be provided",
});

export const registerPushTokenSchema = z.object({
    token: z.string().max(PUSH_TOKEN_MAX_LENGTH).regex(/^Expo(nent)?PushToken\[.+\]$/, "Invalid push token"),
    platform: z.enum(PUSH_PLATFORMS),
    locale: z.enum(SUPPORTED_LANGUAGES).default(DEFAULT_LANGUAGE),
});

export const unregisterPushTokenSchema = z.object({
    token: z.string().min(1, "Push token is required").max(PUSH_TOKEN_MAX_LENGTH),
});

// Matches packing_lists.name VARCHAR(60).
const PACKING_LIST_NAME_MAX_LENGTH = 60;
// The longest template has under a hundred things; this only stops abuse.
const PACKING_LIST_MAX_TEMPLATE_ITEMS = 200;

export const packingListSchema = z.object({
    name: z.string().trim().min(1, "validation.nameRequired").max(PACKING_LIST_NAME_MAX_LENGTH, "validation.tooLong"),
});

// The trip a list is for; null takes it off the trip.
const packingListItineraryField = z.string().uuid("validation.invalid").nullable().optional();

export const updatePackingListSchema = packingListSchema.partial().extend({
    itineraryId: packingListItineraryField,
}).refine((data) => data.name !== undefined || data.itineraryId !== undefined, "Nothing to update");

export const createPackingListSchema = packingListSchema.extend({
    itineraryId: packingListItineraryField,
    items: z.array(z.object({
        category: z.enum(PACKING_CATEGORIES, { errorMap: () => ({ message: "validation.chooseCategory" }) }),
        name: z.string().trim().min(1).max(255),
    })).max(PACKING_LIST_MAX_TEMPLATE_ITEMS, "Too many items").default([]),
});
