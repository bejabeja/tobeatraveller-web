import { Router } from 'express';
import config from '../config/config.js';
import { BadgeRepository } from '../repositories/badgeRepository.js';
import { FollowRepository } from '../repositories/followRepository.js';
import { ItineraryRepository } from '../repositories/itineraryRepository.js';
import { PlacesRepository } from '../repositories/placesRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { BadgeService } from '../services/badgeService.js';
import { ItineraryService } from '../services/itineraryService.js';
import { UserService } from '../services/userService.js';
import { buildDefaultOgMeta, buildItineraryOgMeta, buildPassportOgMeta, buildUserOgMeta } from '../utils/ogMeta.js';
import { userIdParamSchema } from '../utils/schemasValidation.js';
import { escapeXml as esc } from '../utils/xmlEscape.js';

const ogHtml = ({ title, description, imageUrl, pageUrl, redirectUrl, type }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)} - ToBeATraveller</title>
  <meta name="description" content="${esc(description)}" />

  <meta property="og:type"        content="${esc(type)}" />
  <meta property="og:site_name"   content="ToBeATraveller" />
  <meta property="og:url"         content="${esc(pageUrl)}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image"       content="${esc(imageUrl)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(imageUrl)}" />

  <meta http-equiv="refresh" content="0;url=${esc(redirectUrl)}" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(redirectUrl)})</script>
  <p><a href="${esc(redirectUrl)}">${esc(title)}</a></p>
</body>
</html>`;

// Where a shared passport link leads a person, keeping its referral code so
// a sign-up from it still credits whoever shared it.
export const passportPageUrls = (appUrl, userId, referralCode) => {
    const pageUrl = `${appUrl}/profile/${userId}/passport`;
    const redirectUrl = typeof referralCode === 'string' && referralCode
        ? `${pageUrl}?ref=${encodeURIComponent(referralCode)}`
        : pageUrl;
    return { pageUrl, redirectUrl };
};

// These pages are reached through the web's Vercel rewrite for link-preview
// bots, on the very URL being previewed. A redirect back to that URL would
// send the bot through the rewrite again, in a loop, so when the content
// can't be shown (private, deleted) a preview of the app is served instead;
// a person landing here is still sent on to the page by the HTML itself.
const sendOgPage = (res, meta, { pageUrl, redirectUrl, type }) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(ogHtml({ ...meta, pageUrl, redirectUrl, type }));
};

export const createOgRouter = () => {
    const router = Router();

    const itineraryRepository = new ItineraryRepository();
    const placesRepository = new PlacesRepository();
    const itineraryService = new ItineraryService(itineraryRepository, placesRepository);

    const userRepository = new UserRepository();
    const followRepository = new FollowRepository();
    const userService = new UserService(userRepository, itineraryRepository, followRepository);
    // Read-only: the public passport, with no notifications to send.
    const badgeService = new BadgeService(new BadgeRepository(), null, userRepository);

    router.get('/itinerary/:id', async (req, res) => {
        const { id } = req.params;
        const appUrl = config.appUrl;
        const redirectUrl = `${appUrl}/itinerary/${id}`;

        try {
            const itinerary = await itineraryService.getItineraryById(id);
            sendOgPage(res, buildItineraryOgMeta(itinerary, appUrl), { pageUrl: redirectUrl, redirectUrl, type: 'article' });
        } catch {
            sendOgPage(res, buildDefaultOgMeta(appUrl), { pageUrl: redirectUrl, redirectUrl, type: 'website' });
        }
    });

    router.get('/profile/:id', async (req, res) => {
        const { id } = req.params;
        const appUrl = config.appUrl;
        const redirectUrl = `${appUrl}/friend-profile/${id}`;

        try {
            const user = await userService.getUserById(id);
            sendOgPage(res, buildUserOgMeta(user, appUrl), { pageUrl: redirectUrl, redirectUrl, type: 'profile' });
        } catch {
            sendOgPage(res, buildDefaultOgMeta(appUrl), { pageUrl: redirectUrl, redirectUrl, type: 'website' });
        }
    });

    // A shared passport shows who it belongs to and their countries. The
    // referral code is kept on the way to the page, in case a person lands here.
    router.get('/passport/:id', async (req, res) => {
        const appUrl = config.appUrl;
        const idResult = userIdParamSchema.safeParse(req.params.id);
        if (!idResult.success) {
            return sendOgPage(res, buildDefaultOgMeta(appUrl), { pageUrl: appUrl, redirectUrl: appUrl, type: 'website' });
        }

        const { pageUrl, redirectUrl } = passportPageUrls(appUrl, idResult.data, req.query.ref);
        try {
            const passport = await badgeService.getPassport(idResult.data, null);
            sendOgPage(res, buildPassportOgMeta(passport, appUrl), { pageUrl, redirectUrl, type: 'profile' });
        } catch {
            sendOgPage(res, buildDefaultOgMeta(appUrl), { pageUrl, redirectUrl, type: 'website' });
        }
    });

    return router;
};
