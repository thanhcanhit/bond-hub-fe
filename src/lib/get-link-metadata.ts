import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    // Lấy title
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      url;

    // Lấy icon
    const favicon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      `${new URL(url).origin}/favicon.ico`;

    // Lấy image
    const image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content");

    return res.status(200).json({
      title,
      favicon: favicon.startsWith("http")
        ? favicon
        : `${new URL(url).origin}${favicon}`,
      image,
      url,
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return res.status(500).json({ error: "Failed to fetch metadata" });
  }
}
