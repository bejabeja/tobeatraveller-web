import { authFetch, exportRequest } from "@tobeatraveller/shared";
import { parseError } from "../utils/parseError";

export {
    checkUsernameAvailable,
    getUserForAuth,
    getFeaturedUsers,
    getUserById,
    getUserByUsername,
    updateUser,
    changePassword,
    updateMyLanguage,
    deleteMyAccount,
    deleteUserById,
    getAllUsers,
    getAllUsersForAdmin,
    getSignupBreakdown,
    updateUserRole,
    updateUserTier,
    sendAdminNotice,
} from "@tobeatraveller/shared";

const baseUrl = `${import.meta.env.VITE_API_URL}/users`;

// Kept separate from shared's exportMyData: this returns a Blob so the
// browser can trigger a file download, while shared/mobile just needs JSON.
export const exportMyData = async (currentPassword) => {
    const response = await authFetch(`${baseUrl}/me/export`, exportRequest(currentPassword));
    if (!response.ok) {
        await parseError(response, 'Failed to export data');
    }
    return response.blob();
};
