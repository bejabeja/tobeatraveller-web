import { authFetch } from "@tobeatraveller/shared";
import { parseError } from "../utils/parseError";

export {
    checkUsernameAvailable,
    getUserForAuth,
    getFeaturedUsers,
    getUserById,
    updateUser,
    changePassword,
    deleteMyAccount,
    deleteUserById,
    getAllUsers,
    getAllUsersForAdmin,
    updateUserRole,
    updateUserTier,
} from "@tobeatraveller/shared";

const baseUrl = `${import.meta.env.VITE_API_URL}/users`;

// Kept separate from shared's exportMyData: this returns a Blob so the
// browser can trigger a file download, while shared/mobile just needs JSON.
export const exportMyData = async () => {
    const response = await authFetch(`${baseUrl}/me/export`);
    if (!response.ok) {
        await parseError(response, 'Failed to export data');
    }
    return response.blob();
};
