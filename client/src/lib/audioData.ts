// =============================================================================
// DATI AUDIO SEGMENTATI — Biografía Rosalía de Castro + Lieders
// I segmenti corrispondono ai paragrafi del testo DOCX.
// =============================================================================

export interface AudioSegment {
  id: number;
  title: string;
  text: string;
  startTime: number; // secondi
  endTime: number;   // secondi
}

export interface AudioTrack {
  id: string;
  title: string;
  src: string;
  segments: AudioSegment[];
}

const BIOGRAFIA_SEGMENTS: AudioSegment[] = [
  {
    id: 0,
    title: "1. El autor",
    text: "Rosalía de Castro nació en Santiago de Compostela, en Galicia, en 1837 y está considerada una de las figuras esenciales de la literatura española del siglo XIX y la voz más representativa del Rexurdimento gallego. Durante su juventud conoció de cerca la realidad de Galicia, su lengua, sus paisajes y también las dificultades de las clases populares más pobres. Ese contacto con el mundo gallego marcó su sensibilidad y se convirtió en la base de su escritura. En 1856 se trasladó a Madrid, donde entró en contacto con el ambiente literario de la época. Allí publicó su primera novela, titulada La hija del mar, y en 1858 se casó con Manuel Murguía, importante intelectual gallego que siempre apoyó la difusión de su obra. Rosalía murió en 1885 a causa de un cáncer de útero.",
    startTime: 3,
    endTime: 54,
  },
  {
    id: 1,
    title: "2. Las obras principales",
    text: "La producción de Rosalía de Castro incluye novelas, artículos y poemas, pero sus libros más importantes son tres poemarios: Cantares gallegos, Follas novas y, en castellano, En las orillas del Sar. En el primero, Cantares gallegos, publicado en 1863, Rosalía recoge la voz del pueblo gallego, con sus canciones, sus costumbres y su dolor. La obra reivindica la lengua gallega y dignifica una identidad cultural frecuentemente marginada. Follas novas, publicado en 1880, presenta un tono más grave e interior. En esta obra poética, la autora profundiza más en el sufrimiento, la soledad y la reflexión sobre la vida. En las orillas del Sar, publicado en 1884, es aún más intimista y cercano a una sensibilidad moderna. Junto a estos poemarios, Rosalía escribió novelas como La hija del mar, Flavio, El caballero de las botas azules y El primer loco.",
    startTime: 55,
    endTime: 114,
  },
  {
    id: 2,
    title: "3. En las orillas del Sar",
    text: "El poemario En las orillas del Sar fue publicado en 1884 en castellano y suele considerarse la obra más importante de Rosalía de Castro. En este libro, la autora muestra una poesía más madura, reflexiva y moderna que en sus obras anteriores. El título hace referencia al río Sar, un lugar muy ligado a su vida y convertido también en símbolo de su mundo interior. En esta obra poética aparecen algunos de los temas más importantes de Rosalía: el paso del tiempo, la soledad, la pérdida de las ilusiones, la fragilidad humana y la cercanía de la muerte. Además, la naturaleza desempeña un papel fundamental: el río, la niebla, la tarde y las sombras reflejan los sentimientos de la poeta y expresan melancolía e incertidumbre. Por eso, este poemario tiene un tono muy meditativo e íntimo. Su lenguaje parece sencillo, pero transmite muchas emociones e ideas.",
    startTime: 114,
    endTime: 170,
  },
  {
    id: 3,
    title: "4. Lieders",
    text: "Entre los textos en prosa más importantes de Rosalía de Castro destaca Lieders, publicado en 1858. Aunque Lieders es una palabra alemana que significa «canciones», el texto no trata de música. En esta obra, la autora defiende la libertad interior, rechaza las normas impuestas por la sociedad y denuncia la opresión que sufren las mujeres. Con este texto, Rosalía critica la condición femenina en una sociedad dominada por el patriarcado. Por tanto, Lieders no solo tiene un gran valor literario, sino también social y moral. Asimismo, está considerado como uno de los primeros manifiestos del feminismo español.",
    startTime: 170,
    endTime: 212,
  },
  {
    id: 4,
    title: "5. Lenguaje y estilo",
    text: "La escritura de la autora, tanto en prosa como en verso, se caracteriza por su musicalidad, su naturalidad expresiva y el uso frecuente de símbolos tomados de la naturaleza. Elementos como el mar, el río, la noche, el viento o la lluvia aparecen a menudo en sus obras y no solo describen paisajes, sino que también expresan sentimientos de tristeza, soledad, nostalgia o desarraigo. Su lenguaje parece sencillo y espontáneo, pero en realidad encierra una profunda carga simbólica y afectiva. En En las orillas del Sar, el lenguaje se vuelve más íntimo, reflexivo y melancólico. Predominan un tono sombrío y una poesía que transmite inquietud interior, cansancio y dolor existencial. En esta obra, Rosalía utiliza un estilo más maduro, con imágenes sugerentes y símbolos naturales. También hay muchas figuras retóricas, como las anáforas, los paralelismos y las preguntas retóricas, que aportan ritmo, musicalidad y fuerza expresiva, además de reforzar las ideas esenciales de sus textos. En Lieders, en cambio, el lenguaje es más directo, firme y reivindicativo. La autora expresa con intensidad su defensa de la libertad individual y su rechazo de las imposiciones sociales que limitan a la mujer.",
    startTime: 212,
    endTime: 290,
  },
];

const LIEDERS_SEGMENTS: AudioSegment[] = [
  {
    id: 0,
    title: "Párrafo 1",
    text: "¡Oh, no quiero ceñirme a las reglas del arte! Mis pensamientos son vagabundos, mi imaginación errante y mi alma solo se satisface de impresiones. Jamás ha dominado en mi alma la esperanza de la gloria, ni he soñado nunca con laureles que oprimiesen mi frente. Solo cantos de independencia y libertad han balbucido mis labios, aunque alrededor hubiese sentido, desde la cuna ya, el ruido de las cadenas que debían aprisionarme para siempre, porque el patrimonio de la mujer son los grillos de la esclavitud. Yo, sin embargo, soy libre, libre como los pájaros, como las brisas; como los árboles en el desierto y el pirata en la mar. Libre es mi corazón, libre mi alma, y libre mi pensamiento, que se alza hasta el cielo y desciende hasta la tierra, soberbio como el Luzbel y dulce como una esperanza. Cuando los señores de la tierra me amenazan con una mirada, o quieren marcar mi frente con una mancha de oprobio, yo me río como ellos se ríen y hago, en apariencia, mi iniquidad más grande que su iniquidad. En el fondo, no obstante, mi corazón es bueno; pero no acato los mandatos de mis iguales y creo que su hechura es igual a mi hechura, y que su carne es igual a mi carne. Yo soy libre. Nada puede proteger la marcha de mis pensamientos, y ellos son la ley que rige mi destino.",
    startTime: 0,
    endTime: 80,
  },
  {
    id: 1,
    title: "Párrafo 2",
    text: "¡Oh mujer! ¿Por qué siendo tan pura vienen a proyectarse sobre los blancos rayos que despide tu frente las impías sombras de los vicios de la tierra? ¿Por qué los hombres derraman sobre ti la inmundicia de sus excesos, despreciando y aborreciendo después en tu moribundo cansancio lo horrible de sus mismos desórdenes y de sus calenturientos delirios? Todo lo que viene a formarse de sombrío y macilento en tu mirada después del primer destello de tu juventud inocente, todo lo que viene a manchar de cieno los blancos ropajes con que te vistieron las primeras alboradas de tu infancia, y a extinguir tus olorosas esencias y borrar las imágenes de la virtud en tu pensamiento, todo te lo transmiten ellos todo..., y, sin embargo, te desprecian.",
    startTime: 80,
    endTime: 122,
  },
  {
    id: 2,
    title: "Párrafo 3",
    text: "Los remordimientos son la herencia de las mujeres débiles. Ellos corroen su existencia con el recuerdo de unos placeres que hoy compraron a costa de su felicidad y que mañana pesarán sobre su alma como soplo candente. Espectros dormidos que descansan impasibles en el regazo que se dispone a recibir otro objeto que el que ellos nos presentan, y abrazos que reciben otros abrazos que hemos jurado no admitir jamás. Dolores punzantes y desgarradores por lo pasado, arrepentimientos vanos, enmiendas de un instante y reproducciones eternas en la culpa, y un deseo de virtud para lo futuro, un nombre honrado y sin mancillar que poder entregar al hombre que nos pide sinceramente una existencia desnuda de riquezas, más pródiga en bondades y sensaciones vírgenes. He aquí las luchas precedidas siempre por los remordimientos que velan nuestro sueño, nuestras esperanzas, nuestras ambiciones. ¡Y todo esto por una debilidad!",
    startTime: 122,
    endTime: 182,
  },
];

export const AUDIO_TRACKS: Record<string, AudioTrack> = {
  biografia: {
    id: "biografia",
    title: "Biografía de Rosalía de Castro",
    src: "/audio/biografia.m4a",
    segments: BIOGRAFIA_SEGMENTS,
  },
  lieders: {
    id: "lieders",
    title: "Lieders",
    src: "/audio/lieders.m4a",
    segments: LIEDERS_SEGMENTS,
  },
};

/** Restituisce il track ID corrispondente al gruppo MAPA */
export function getTrackForGroup(group: 1 | 2): string {
  return group === 1 ? "biografia" : "lieders";
}
