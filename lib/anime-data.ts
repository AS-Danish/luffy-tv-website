export type AnimeRecord = {
  slug: string;
  title: string;
  eyebrow: string;
  japaneseTitle: string;
  year: number;
  score: number;
  match: number;
  type: "Series" | "Movie";
  status: "Airing" | "Completed";
  rating: string;
  duration: string;
  episodeCount: number;
  latestEpisode: number;
  sub: number;
  dub: number;
  genres: string[];
  studio: string;
  summary: string;
  poster: string;
  backdrop: string;
  accent: string;
};

export type EpisodeRecord = {
  number: number;
  title: string;
  duration: string;
  released: string;
  progress?: number;
};

const images = {
  frierenPoster:
    "https://pics.filmaffinity.com/Frieren_Tras_finalizar_el_viaje_Serie_de_TV-366032840-large.jpg",
  frierenBackdrop:
    "https://ogre.natalie.mu/media/news/comic/2023/0823/frieren_kv0823.jpg?impolicy=pp",
  solo:
    "https://s.yimg.com/ny/api/res/1.2/44UsgPgX_Ztgw6QRHnGcaw--/YXBwaWQ9aGlnaGxhbmRlcjt3PTI0MDA7aD0xNjk4O2NmPXdlYnA-/https%3A/media.zenfs.com/en/teen_vogue_128/ca5a6a24fd81153e56572a4a40a479ee",
  jujutsu:
    "https://gamemag.ru/images/imagemanager/cache/ed/1421/ed1421_jujutsu-scaled.jpeg",
  dandadanPoster:
    "https://lrmonline.com/wp-content/uploads/2025/09/DAN-DA-DAN-Key-Visual-2x3-%C2%A9Yukinobu-Tatsu_SHUEISHA-DANDADAN-Production-Committee-scaled.jpg",
  dandadanBackdrop:
    "https://www.bubbleblabber.com/wp-content/uploads/2025/04/dandadans2.jpeg",
  apothecary:
    "https://a.storyblok.com/f/178900/2897x4096/e831151025/the-apothecary-diaries-main-visual.webp/m/filters%3Aquality%2895%29format%28webp%29",
  demonSlayer:
    "https://kimetsu.com/anime/kimetsutheater/assets/img/img_kv_1.jpg",
  onePiece:
    "https://images.unsplash.com/photo-1498623116890-37e912163d5d?auto=format&fit=crop&w=1400&q=82",
  kaiju:
    "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1400&q=82",
  violet:
    "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1400&q=82",
  titan:
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=82",
};

export const animeCatalog: AnimeRecord[] = [
  {
    slug: "frieren",
    title: "Frieren: Beyond Journey's End",
    eyebrow: "The journey continues",
    japaneseTitle: "葬送のフリーレン",
    year: 2023,
    score: 9.4,
    match: 98,
    type: "Series",
    status: "Completed",
    rating: "TV-14",
    duration: "24m",
    episodeCount: 28,
    latestEpisode: 28,
    sub: 28,
    dub: 28,
    genres: ["Adventure", "Drama", "Fantasy"],
    studio: "Madhouse",
    summary:
      "Decades after the hero's victory, an elven mage begins a quiet pilgrimage to understand the lives she once passed by.",
    poster: images.frierenPoster,
    backdrop: images.frierenBackdrop,
    accent: "#87b6a7",
  },
  {
    slug: "solo-leveling",
    title: "Solo Leveling",
    eyebrow: "Arise from the shadows",
    japaneseTitle: "俺だけレベルアップな件",
    year: 2024,
    score: 8.8,
    match: 97,
    type: "Series",
    status: "Airing",
    rating: "TV-MA",
    duration: "24m",
    episodeCount: 25,
    latestEpisode: 25,
    sub: 25,
    dub: 25,
    genres: ["Action", "Adventure", "Fantasy"],
    studio: "A-1 Pictures",
    summary:
      "Humanity's weakest hunter receives a singular power and begins a relentless ascent through dungeons, danger, and destiny.",
    poster: images.solo,
    backdrop: images.solo,
    accent: "#7564ff",
  },
  {
    slug: "jujutsu-kaisen",
    title: "Jujutsu Kaisen",
    eyebrow: "The strongest return",
    japaneseTitle: "呪術廻戦",
    year: 2023,
    score: 8.9,
    match: 96,
    type: "Series",
    status: "Completed",
    rating: "TV-MA",
    duration: "24m",
    episodeCount: 47,
    latestEpisode: 47,
    sub: 47,
    dub: 47,
    genres: ["Action", "Supernatural", "School"],
    studio: "MAPPA",
    summary:
      "A gifted student enters a hidden war between sorcerers and curses after swallowing a relic of unimaginable power.",
    poster: images.jujutsu,
    backdrop: images.jujutsu,
    accent: "#4167d9",
  },
  {
    slug: "dandadan",
    title: "Dan Da Dan",
    eyebrow: "Ghosts. Aliens. First love.",
    japaneseTitle: "ダンダダン",
    year: 2024,
    score: 8.6,
    match: 95,
    type: "Series",
    status: "Airing",
    rating: "TV-14",
    duration: "23m",
    episodeCount: 24,
    latestEpisode: 18,
    sub: 18,
    dub: 17,
    genres: ["Action", "Comedy", "Supernatural"],
    studio: "Science SARU",
    summary:
      "Two classmates challenge each other's beliefs and stumble into a neon collision of spirits, aliens, and impossible romance.",
    poster: images.dandadanPoster,
    backdrop: images.dandadanBackdrop,
    accent: "#e53f47",
  },
  {
    slug: "apothecary-diaries",
    title: "The Apothecary Diaries",
    eyebrow: "Every mystery leaves a trace",
    japaneseTitle: "薬屋のひとりごと",
    year: 2023,
    score: 8.9,
    match: 94,
    type: "Series",
    status: "Airing",
    rating: "TV-14",
    duration: "23m",
    episodeCount: 48,
    latestEpisode: 48,
    sub: 48,
    dub: 48,
    genres: ["Drama", "Mystery", "Historical"],
    studio: "TOHO Animation Studio",
    summary:
      "A sharp-eyed apothecary turns palace rumors, subtle symptoms, and courtly intrigue into mysteries only she can solve.",
    poster: images.apothecary,
    backdrop: images.apothecary,
    accent: "#68a078",
  },
  {
    slug: "demon-slayer",
    title: "Demon Slayer",
    eyebrow: "Set your heart ablaze",
    japaneseTitle: "鬼滅の刃",
    year: 2024,
    score: 8.7,
    match: 93,
    type: "Series",
    status: "Airing",
    rating: "TV-MA",
    duration: "24m",
    episodeCount: 63,
    latestEpisode: 63,
    sub: 63,
    dub: 63,
    genres: ["Action", "Historical", "Supernatural"],
    studio: "ufotable",
    summary:
      "A kindhearted swordsman joins the Demon Slayer Corps to restore his sister's humanity and avenge his family.",
    poster: images.demonSlayer,
    backdrop: images.demonSlayer,
    accent: "#55a68c",
  },
  {
    slug: "one-piece",
    title: "One Piece",
    eyebrow: "Set sail for the impossible",
    japaneseTitle: "ワンピース",
    year: 1999,
    score: 8.7,
    match: 92,
    type: "Series",
    status: "Airing",
    rating: "TV-14",
    duration: "24m",
    episodeCount: 1140,
    latestEpisode: 1140,
    sub: 1140,
    dub: 1100,
    genres: ["Adventure", "Comedy", "Fantasy"],
    studio: "Toei Animation",
    summary:
      "A fearless captain and his found family cross a limitless sea in pursuit of freedom, friendship, and the ultimate treasure.",
    poster: images.onePiece,
    backdrop: images.onePiece,
    accent: "#309ac0",
  },
  {
    slug: "kaiju-no-8",
    title: "Kaiju No. 8",
    eyebrow: "The monster inside",
    japaneseTitle: "怪獣8号",
    year: 2024,
    score: 8.3,
    match: 91,
    type: "Series",
    status: "Airing",
    rating: "TV-14",
    duration: "24m",
    episodeCount: 24,
    latestEpisode: 20,
    sub: 20,
    dub: 19,
    genres: ["Action", "Military", "Sci-Fi"],
    studio: "Production I.G",
    summary:
      "A cleanup worker gains the power of the creatures he once disposed of—and a final chance to join the defense force.",
    poster: images.kaiju,
    backdrop: images.kaiju,
    accent: "#d8e457",
  },
  {
    slug: "violet-evergarden",
    title: "Violet Evergarden",
    eyebrow: "Words that reach the heart",
    japaneseTitle: "ヴァイオレット・エヴァーガーデン",
    year: 2018,
    score: 8.7,
    match: 90,
    type: "Series",
    status: "Completed",
    rating: "TV-14",
    duration: "24m",
    episodeCount: 13,
    latestEpisode: 13,
    sub: 13,
    dub: 13,
    genres: ["Drama", "Fantasy", "Romance"],
    studio: "Kyoto Animation",
    summary:
      "A former child soldier learns the language of emotion by writing letters that give voice to other people's hearts.",
    poster: images.violet,
    backdrop: images.violet,
    accent: "#c9a66b",
  },
  {
    slug: "attack-on-titan",
    title: "Attack on Titan",
    eyebrow: "Beyond the walls",
    japaneseTitle: "進撃の巨人",
    year: 2023,
    score: 9.0,
    match: 96,
    type: "Series",
    status: "Completed",
    rating: "TV-MA",
    duration: "24m",
    episodeCount: 94,
    latestEpisode: 94,
    sub: 94,
    dub: 94,
    genres: ["Action", "Drama", "Suspense"],
    studio: "MAPPA",
    summary:
      "Humanity's fight for survival becomes a devastating reckoning with freedom, memory, and the cycle of war.",
    poster: images.titan,
    backdrop: images.titan,
    accent: "#9d6a4e",
  },
];

export const featuredAnime = [
  animeCatalog[0],
  animeCatalog[1],
  animeCatalog[3],
];

export const homeRails = [
  {
    id: "trending",
    eyebrow: "What everyone is watching",
    title: "Trending now",
    items: [animeCatalog[1], animeCatalog[3], animeCatalog[0], animeCatalog[2], animeCatalog[5], animeCatalog[6]],
  },
  {
    id: "new-episodes",
    eyebrow: "Fresh from Japan",
    title: "New episodes",
    items: [animeCatalog[4], animeCatalog[7], animeCatalog[3], animeCatalog[5], animeCatalog[6], animeCatalog[1]],
  },
  {
    id: "critics",
    eyebrow: "Exceptional stories, beautifully told",
    title: "Critically acclaimed",
    items: [animeCatalog[0], animeCatalog[9], animeCatalog[4], animeCatalog[8], animeCatalog[2]],
  },
];

export const continueWatching = [
  { anime: animeCatalog[1], episode: 11, progress: 68, remaining: "8 min left" },
  { anime: animeCatalog[2], episode: 38, progress: 84, remaining: "4 min left" },
  { anime: animeCatalog[0], episode: 17, progress: 42, remaining: "14 min left" },
];

export const weeklySchedule = [
  { day: "MON", date: "18", releases: [{ time: "19:30", anime: animeCatalog[7], episode: 20 }, { time: "22:00", anime: animeCatalog[4], episode: 48 }] },
  { day: "TUE", date: "19", releases: [{ time: "18:00", anime: animeCatalog[3], episode: 19 }] },
  { day: "WED", date: "20", releases: [{ time: "20:30", anime: animeCatalog[1], episode: 26 }, { time: "23:00", anime: animeCatalog[5], episode: 64 }] },
  { day: "THU", date: "21", releases: [{ time: "21:00", anime: animeCatalog[6], episode: 1141 }] },
  { day: "FRI", date: "22", releases: [{ time: "19:00", anime: animeCatalog[0], episode: 29 }] },
  { day: "SAT", date: "23", releases: [{ time: "17:30", anime: animeCatalog[2], episode: 48 }, { time: "22:30", anime: animeCatalog[3], episode: 20 }] },
  { day: "SUN", date: "24", releases: [{ time: "20:00", anime: animeCatalog[4], episode: 49 }] },
];

export function getAnime(slug: string) {
  return animeCatalog.find((anime) => anime.slug === slug);
}

export function getEpisodes(anime: AnimeRecord): EpisodeRecord[] {
  const titles = [
    "The Beginning After the End",
    "A Quiet Promise",
    "The Shape of Memory",
    "Through the Northern Pass",
    "A Familiar Spell",
    "The Hero's Footprints",
    "Where the Road Divides",
    "A Sky Full of Stars",
    "The Last Village",
    "What We Leave Behind",
    "A New Dawn",
    "Beyond the Journey",
  ];

  return Array.from({ length: Math.min(anime.episodeCount, 12) }, (_, index) => ({
    number: index + 1,
    title: titles[index],
    duration: anime.duration,
    released: `Aug ${String(index + 1).padStart(2, "0")}`,
    progress: index === 0 ? 100 : index === 1 ? 38 : undefined,
  }));
}

export const apiIntegrationMap = {
  home: "/api/home",
  search: "/api/search?keyword={query}",
  details: "/api/anime/{slug}",
  episodes: "/api/anime/{slug}/episodes",
  watch: "/api/watch/{slug}?ep={episode}&stream=false",
} as const;
