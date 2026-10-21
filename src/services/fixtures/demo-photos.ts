import "server-only";

import type { Photo } from "@/types/travel";

/**
 * Development-only sample used when UNSPLASH_ACCESS_KEY is not set (see `isDemoMode`).
 * Image IDs and dimensions are real Unsplash assets (verified via the imgix `fm=json`
 * endpoint); titles and places were labeled by hand. Photographer credits are not
 * known for this sample, so attribution points to Unsplash itself.
 */
type Seed = [
  id: string,
  width: number,
  height: number,
  color: string,
  title: string,
  city: string | null,
  country: string | null,
  tags: string[],
];

const SEEDS: Seed[] = [
  ["1493976040374-85c8e12f0c0e", 7360, 4912, "#6b4a3a", "Calle de Higashiyama al atardecer", "Kioto", "Japón", ["templos", "cultura", "calles", "asia"]],
  ["1506905925346-21bda4d32df4", 4878, 3252, "#8a8fa6", "Cumbres sobre un mar de nubes", null, null, ["montañas", "amanecer", "nubes"]],
  ["1507525428034-b723cf961d3e", 4621, 3072, "#d9c6a5", "Playa al amanecer", null, null, ["playa", "mar", "amanecer"]],
  ["1469474968028-56623f02e42e", 3506, 2329, "#6b6a3a", "Valle verde entre montañas", null, null, ["montañas", "naturaleza", "senderismo"]],
  ["1501785888041-af3ef285b470", 5979, 3986, "#3aa6a6", "Barca en el lago di Braies", "Dolomitas", "Italia", ["lagos", "montañas", "europa"]],
  ["1476514525535-07fb3b4ae5f1", 4896, 3264, "#4f6b5a", "Paseo en barca por el lago", "Dolomitas", "Italia", ["lagos", "montañas", "europa"]],
  ["1500530855697-b586d89ba3ee", 3648, 5472, "#a65a40", "Carretera entre rocas rojas", null, null, ["desierto", "carreteras", "aventura"]],
  ["1502602898657-3e91760cbb34", 5309, 3530, "#6a6f9a", "Torre Eiffel al anochecer", "París", "Francia", ["ciudades", "monumentos", "europa"]],
  ["1513635269975-59663e0ac1ad", 4896, 3264, "#8a8f8f", "El Támesis desde las alturas", "Londres", "Reino Unido", ["ciudades", "ríos", "europa"]],
  ["1499856871958-5b9627545d1a", 5520, 3905, "#6a5a8a", "Puente Alejandro III", "París", "Francia", ["ciudades", "puentes", "europa"]],
  ["1523906834658-6e24ef2386f9", 3641, 5522, "#8ac0d0", "Puente de Rialto", "Venecia", "Italia", ["ciudades", "canales", "europa"]],
  ["1537996194471-e657df975ab4", 2977, 3951, "#4a5a4a", "Templo Ulun Danu Bratan", "Bali", "Indonesia", ["templos", "lagos", "asia"]],
  ["1528127269322-539801943592", 6000, 4000, "#7a9aa0", "Bahía de Ha Long", "Ha Long", "Vietnam", ["mar", "islas", "asia"]],
  ["1516483638261-f4dbaf036963", 2675, 4027, "#b07a5a", "Manarola sobre el acantilado", "Cinque Terre", "Italia", ["costa", "pueblos", "europa"]],
  ["1533105079780-92b9be482077", 3630, 5445, "#3a6ab0", "Vista al Egeo entre casas blancas", "Santorini", "Grecia", ["islas", "mar", "europa"]],
  ["1491557345352-5929e343eb89", 3264, 2176, "#c0a0a0", "Pueblo reflejado en el río", null, null, ["pueblos", "ríos", "europa"]],
  ["1504280390367-361c6d9f38f4", 4498, 3000, "#b07a3a", "Amanecer desde la tienda de campaña", null, null, ["camping", "bosque", "aventura"]],
  ["1540959733332-eab4deabeeaf", 7767, 5039, "#3ab0c0", "Neones de Tokio", "Tokio", "Japón", ["ciudades", "noche", "asia"]],
  ["1526392060635-9d6019884377", 6000, 4000, "#5a6a5a", "Machu Picchu entre nubes", "Cusco", "Perú", ["montañas", "ruinas", "sudamérica"]],
  ["1518548419970-58e3b4079ab2", 3456, 2304, "#5a7a8a", "Templo de Tanah Lot al atardecer", "Bali", "Indonesia", ["templos", "mar", "asia"]],
  ["1539650116574-8efeb43e2750", 8504, 5675, "#d9c0a0", "Pirámides de Guiza", "El Cairo", "Egipto", ["desierto", "monumentos", "áfrica"]],
  ["1552832230-c0197dd311b5", 6293, 4588, "#6a8ab0", "El Coliseo al anochecer", "Roma", "Italia", ["ciudades", "monumentos", "europa"]],
  ["1520250497591-112f2f40a3f4", 3456, 2304, "#3ab0b0", "Piscina en un resort tropical", null, null, ["trópico", "playa", "descanso"]],
  ["1531366936337-7c912a4589a7", 3000, 2000, "#1a2a4a", "Aurora boreal sobre la nieve", null, null, ["auroras", "invierno", "noche"]],
  ["1512453979798-5ea266f8880c", 2400, 1600, "#8a6a5a", "Dubái al atardecer", "Dubái", "Emiratos Árabes Unidos", ["ciudades", "rascacielos", "desierto"]],
  ["1534430480872-3498386e7856", 5889, 3926, "#a0a0a0", "Manhattan desde lo alto", "Nueva York", "Estados Unidos", ["ciudades", "rascacielos"]],
  ["1505761671935-60b3a7427bad", 7155, 4775, "#c0c0c0", "Big Ben y el puente de Westminster", "Londres", "Reino Unido", ["ciudades", "monumentos", "europa"]],
  ["1527631746610-bca00a040d60", 4000, 6000, "#6a5a4a", "Callejón de piedra", null, null, ["ciudades", "mochila", "europa"]],
  ["1530789253388-582c481c54b0", 6000, 4000, "#40a0a0", "Globos sobre Capadocia", "Capadocia", "Turquía", ["globos", "amanecer", "asia"]],
  ["1503220317375-aaad61436b1b", 2449, 1633, "#6a7a7a", "Mochilero frente al lago", null, null, ["lagos", "montañas", "aventura"]],
];

function imageUrl(id: string, width?: number) {
  const base = `https://images.unsplash.com/photo-${id}?ixlib=rb-4.1.0&q=80&fm=jpg`;
  return width ? `${base}&w=${width}&fit=max` : base;
}

export const DEMO_PHOTOS: Photo[] = SEEDS.map(([id, width, height, color, title, city, country, tags]) => ({
  id,
  width,
  height,
  color,
  blurHash: null,
  alt: title,
  title,
  city,
  country,
  tags,
  urls: {
    thumb: imageUrl(id, 200),
    small: imageUrl(id, 400),
    regular: imageUrl(id, 1080),
    full: imageUrl(id),
  },
  photographer: { name: "Unsplash", username: "unsplash", profileUrl: "https://unsplash.com" },
  unsplashUrl: "https://unsplash.com",
}));
