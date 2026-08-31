import clubPhoto from "../../public/img/disco.jpg"

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  image?: string
}

export type MenuCategory = {
  slug: string
  label: string
  items: MenuItem[]
}

export const menu: MenuCategory[] = [
  {
    slug: "signature",
    label: "Авторські коктейлі",
    items: [
      {
        id: "faust-sour",
        name: "Faust Sour",
        description: "бурбон, лимон, яєчний білок, ангостура",
        price: 320,
        image: clubPhoto.src,
      },
      {
        id: "velvet-smoke",
        name: "Velvet Smoke",
        description: "мескаль, гранат, чилі, копчений розмарин",
        price: 340,
        image: clubPhoto.src,
      },
      {
        id: "violet-hour",
        name: "Violet Hour",
        description: "джин, лаванда, лимонний сік, тонік",
        price: 300,
        image: clubPhoto.src,
      },
      {
        id: "black-orchid",
        name: "Black Orchid",
        description: "вотка, ожина, лайм, активоване вугілля",
        price: 310,
        image: clubPhoto.src,
      },
      {
        id: "midnight-spritz",
        name: "Midnight Spritz",
        description: "апероль, просекко, содова, апельсин",
        price: 290,
        image: clubPhoto.src,
      },
      {
        id: "kyiv-mule",
        name: "Kyiv Mule",
        description: "крафтова вотка, імбирне пиво, лайм",
        price: 280,
        image: clubPhoto.src,
      },
    ],
  },
  {
    slug: "classic",
    label: "Класика",
    items: [
      {
        id: "old-fashioned",
        name: "Old Fashioned",
        description: "бурбон, цукровий сироп, ангостура",
        price: 300,
        image: clubPhoto.src,
      },
      {
        id: "negroni",
        name: "Negroni",
        description: "джин, кампарі, червоний вермут",
        price: 290,
        image: clubPhoto.src,
      },
      { id: "margarita", name: "Margarita", description: "текіла, трипл сек, лайм", price: 280, image: clubPhoto.src },
      { id: "mojito", name: "Mojito", description: "ромм, м'ята, лайм, содова", price: 260, image: clubPhoto.src },
      {
        id: "daiquiri",
        name: "Daiquiri",
        description: "білий ромм, лайм, цукровий сироп",
        price: 260,
        image: clubPhoto.src,
      },
      {
        id: "cosmopolitan",
        name: "Cosmopolitan",
        description: "вотка, трипл сек, журавлина, лайм",
        price: 290,
        image: clubPhoto.src,
      },
    ],
  },
  {
    slug: "shots",
    label: "Шоти",
    items: [
      {
        id: "b-52",
        name: "Б-52",
        description: "кавовий лікер, ірландський крем, трипл сек",
        price: 150,
        image: clubPhoto.src,
      },
      {
        id: "chemical",
        name: "Кемікал",
        description: "текіла, блю кюрасао, енергетик",
        price: 140,
        image: clubPhoto.src,
      },
      { id: "jager-bomb", name: "Джагербомб", description: "єгермайстер, енергетик", price: 160, image: clubPhoto.src },
      { id: "kamikaze", name: "Камікадзе", description: "вотка, трипл сек, лайм", price: 130, image: clubPhoto.src },
      {
        id: "mint-tequila",
        name: "М'ятна текіла",
        description: "текіла, м'ятний лікер, лайм",
        price: 140,
        image: clubPhoto.src,
      },
    ],
  },
  {
    slug: "spirits",
    label: "Міцне",
    items: [
      {
        id: "whiskey-neat",
        name: "Віскі",
        description: "Jameson / Jack Daniel's / Chivas 12",
        price: 220,
        image: clubPhoto.src,
      },
      { id: "cognac", name: "Коньяк", description: "Hennessy VS", price: 260, image: clubPhoto.src },
      { id: "tequila", name: "Текіла", description: "Olmeca Silver / Reposado", price: 200, image: clubPhoto.src },
      { id: "gin", name: "Джин", description: "Beefeater / Hendrick's", price: 210, image: clubPhoto.src },
      { id: "rum", name: "Ромм", description: "Bacardi / Captain Morgan", price: 200, image: clubPhoto.src },
    ],
  },
  {
    slug: "wine",
    label: "Вино й ігристе",
    items: [
      { id: "prosecco", name: "Просекко", description: "келих / пляшка, Італія", price: 220, image: clubPhoto.src },
      {
        id: "champagne",
        name: "Шампанське",
        description: "келих / пляшка, Moët & Chandon",
        price: 350,
        image: clubPhoto.src,
      },
      { id: "white-wine", name: "Біле вино", description: "келих, Совіньйон Блан", price: 200, image: clubPhoto.src },
      {
        id: "red-wine",
        name: "Червоне вино",
        description: "келих, Каберне Совіньйон",
        price: 200,
        image: clubPhoto.src,
      },
      { id: "rose", name: "Розе", description: "келих, Прованс", price: 220, image: clubPhoto.src },
    ],
  },
  {
    slug: "beer",
    label: "Пиво",
    items: [
      { id: "lager", name: "Лагер", description: "розлив 0.5", price: 130, image: clubPhoto.src },
      { id: "ipa", name: "IPA", description: "крафтове, розлив 0.4", price: 160, image: clubPhoto.src },
      { id: "stout", name: "Стаут", description: "темне, пляшка 0.33", price: 150, image: clubPhoto.src },
      { id: "wheat", name: "Пшеничне", description: "нефільтроване, розлив 0.5", price: 140, image: clubPhoto.src },
    ],
  },
  {
    slug: "non-alcoholic",
    label: "Безалкогольне",
    items: [
      {
        id: "virgin-mojito",
        name: "Virgin Mojito",
        description: "м'ята, лайм, содова",
        price: 180,
        image: clubPhoto.src,
      },
      {
        id: "lemonade",
        name: "Домашній лимонад",
        description: "цитрус, м'ята, ягоди",
        price: 150,
        image: clubPhoto.src,
      },
      { id: "cola", name: "Кола / Спрайт", description: "0.33", price: 90, image: clubPhoto.src },
      { id: "water", name: "Вода", description: "негазована / газована, 0.5", price: 70, image: clubPhoto.src },
      { id: "espresso", name: "Еспресо", description: "подвійний", price: 90, image: clubPhoto.src },
    ],
  },
  {
    slug: "snacks",
    label: "Снеки",
    items: [
      { id: "nuts", name: "Мікс горіхів", description: "мигдаль, кешью, фундук", price: 160, image: clubPhoto.src },
      { id: "chips", name: "Начос", description: "сирний соус, халапеньйо", price: 220, image: clubPhoto.src },
      { id: "wings", name: "Крильця", description: "гострий соус баффало", price: 260, image: clubPhoto.src },
      {
        id: "bruschetta",
        name: "Брускети",
        description: "томати, базилік, пармезан",
        price: 210,
        image: clubPhoto.src,
      },
      { id: "olives", name: "Оливки", description: "мікс, зелень, цитрус", price: 140, image: clubPhoto.src },
    ],
  },
]
