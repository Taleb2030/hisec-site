// Data shared by every language. Text lives in fr.mjs / en.mjs / ar.mjs.

export const LANGS = ["fr", "en", "ar"]; // first = default, served at "/"

export const PHONE = "+222 45 25 56 90";
export const TEL = "tel:+22245255690";
export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Zone+des+Ambassades+Tevragh+Zeina+Nouakchott";
export const mapEmbed = (lang) =>
  `https://www.google.com/maps?q=Zone+des+Ambassades,+Tevragh+Zeina,+Nouakchott,+Mauritanie&hl=${lang}&output=embed`;

// Order = display order. `file` is the same slug in every language.
export const SOLUTIONS = [
  { key: "incendie",     file: "securite-incendie.html",  icon: "flame",    cam: "CAM 01", img: "incendie.jpg" },
  { key: "interphonie",  file: "interphonie.html",        icon: "intercom", cam: "CAM 02", img: "interphonie.jpg" },
  { key: "video",        file: "videosurveillance.html",  icon: "camera",   cam: "CAM 03", img: "videosurveillance.jpg" },
  { key: "acces",        file: "controle-acces.html",     icon: "key",      cam: "CAM 04", img: "controle-acces.jpg" },
  { key: "cables",       file: "cables-accessoires.html", icon: "plug",     cam: "CAM 05", img: "cables.jpg" },
  { key: "intrusion",    file: "intrusion.html",          icon: "siren",    cam: "CAM 06", img: "intrusion.jpg" },
  { key: "haute",        file: "haute-securite.html",     icon: "barrier",  cam: "CAM 07", img: "haute-securite.jpg" },
];

// Solutions shown on the home-page camera wall (fallback when 3D is off).
export const WALL = ["incendie", "video", "acces", "intrusion"];
