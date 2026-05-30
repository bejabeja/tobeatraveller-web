import { Router } from 'express';
import config from '../config/config.js';
import { ItineraryRepository } from '../repositories/itineraryRepository.js';
import { PlacesRepository } from '../repositories/placesRepository.js';
import { ItineraryService } from '../services/itineraryService.js';

const esc = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ogHtml = ({ title, description, imageUrl, pageUrl, redirectUrl }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)} — ToBeATraveller</title>
  <meta name="description" content="${esc(description)}" />

  <meta property="og:type"        content="article" />
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

export const createOgRouter = () => {
    const router = Router();

    const itineraryRepository = new ItineraryRepository();
    const placesRepository = new PlacesRepository();
    const itineraryService = new ItineraryService(itineraryRepository, placesRepository);

    router.get('/itinerary/:id', async (req, res) => {
        const { id } = req.params;
        const appUrl = config.appUrl;
        const redirectUrl = `${appUrl}/itinerary/${id}`;

        try {
            const itinerary = await itineraryService.getItineraryById(id);

            const title = itinerary.title || 'Trip on ToBeATraveller';
            const description = itinerary.description
                ? itinerary.description.slice(0, 160)
                : `A ${itinerary.tripTotalDays}-day trip to ${itinerary.location?.name || 'an amazing destination'}`;
            const imageUrl = itinerary.photoUrl || `${appUrl}/images/hero.jpg`;

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.send(ogHtml({ title, description, imageUrl, pageUrl: redirectUrl, redirectUrl }));
        } catch {
            res.redirect(302, redirectUrl);
        }
    });

    return router;
};
