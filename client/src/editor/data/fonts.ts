export const FONT_LIST = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
  "Ubuntu",
  "Oswald",
  "PT Sans",
  "Noto Sans",
  "Rubik",
  "Work Sans",
  "Quicksand",
  "Mulish",
  "Barlow",
  "DM Sans",
  "Karla",
  "Josefin Sans",
  "Cabin",
  "Archivo",
  "Bitter",
  "Crimson Text",
  "EB Garamond",
  "Libre Baskerville",
  "Cormorant Garamond",
  "Dancing Script",
  "Pacifico",
  "Caveat",
  "Sacramento",
  "Great Vibes",
  "Lobster",
  "Satisfy",
  "Permanent Marker",
  "Shadows Into Light",
  "Indie Flower",
  "Comfortaa",
  "Righteous",
  "Bebas Neue",
  "Anton",
  "Alfa Slab One",
  "Bungee",
  "Bangers",
  "Press Start 2P",
  "Orbitron",
  "Audiowide",
  "Russo One",
  "Black Ops One",
  "Titan One",
  "Fredoka One",
  "Paytone One",
];

export const FONT_CATEGORIES: Record<string, string[]> = {
  "Sans Serif": [
    "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
    "Raleway", "Nunito", "Source Sans Pro", "Ubuntu", "Oswald", "PT Sans",
    "Noto Sans", "Rubik", "Work Sans", "Quicksand", "Mulish", "Barlow",
    "DM Sans", "Karla", "Josefin Sans", "Cabin", "Archivo",
  ],
  "Serif": [
    "Playfair Display", "Merriweather", "Bitter", "Crimson Text",
    "EB Garamond", "Libre Baskerville", "Cormorant Garamond",
  ],
  "Handwriting": [
    "Dancing Script", "Pacifico", "Caveat", "Sacramento", "Great Vibes",
    "Lobster", "Satisfy", "Shadows Into Light", "Indie Flower",
  ],
  "Display": [
    "Permanent Marker", "Comfortaa", "Righteous", "Bebas Neue", "Anton",
    "Alfa Slab One", "Bungee", "Bangers", "Press Start 2P", "Orbitron",
    "Audiowide", "Russo One", "Black Ops One", "Titan One", "Fredoka One",
    "Paytone One",
  ],
};

let fontsLoaded = false;

export function loadGoogleFonts(): Promise<void> {
  if (fontsLoaded) return Promise.resolve();

  return new Promise((resolve) => {
    const families = FONT_LIST.map((f) => `${f}:400,700,400italic,700italic`);
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${encodeURIComponent(f.replace(/:.*/, ""))}&`).join("")}display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    fontsLoaded = true;
    setTimeout(resolve, 500);
  });
}
