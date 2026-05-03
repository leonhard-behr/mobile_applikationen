import hashlib
from datetime import date

WORD_POOL = [
    "apfel", "brücke", "burg", "delfin", "motor",
    "wald", "gitarre", "hammer", "insel", "dschungel",
    "küche", "laterne", "berg", "notizbuch", "ozean",
    "klavier", "fluss", "sonnenuntergang", "turm", "regenschirm",
    "dorf", "fenster", "garten", "hafen", "kerze",
    "wüste", "adler", "brunnen", "gletscher", "horizont",
    "jacke", "kessel", "leiter", "marmor", "nadel",
    "orange", "palast", "kaninchen", "sattel", "tempel",
    "geige", "wal", "anker", "korb", "schlucht",
    "drache", "feder", "schatten", "spiegel", "planet",
    "rakete", "silber", "donner", "kristall", "diamant",
    "smaragd", "falke", "kelch", "helm", "eisberg",
    "juwel", "ritter", "zitrone", "magnet", "nebel",
    "orchidee", "perle", "quarz", "band", "sphinx",
    "tunnel", "samt", "walnuss", "leuchtturm", "teppich",
    "dolch", "flamme", "höhle", "beil", "insekt",
    "jasmin", "kätzchen", "bibliothek", "wiese", "nektar",
    "auster", "pfeffer", "decke", "schornstein", "esel",
    "fossil", "knoblauch", "honig", "iglu", "puzzle",
    "statue", "wolke", "stern", "schnee", "regen",
]

ANCHOR_CANDIDATES = [
    "ding", "gegenstand", "ort", "stück", "form",
    "form", "teil", "art", "welt", "natur",
    "raum", "feld", "punkt", "stein", "metall",
    "glas", "holz", "wasser", "licht", "klang",
    "farbe", "erde", "wolke", "haus", "tisch",
    "stuhl", "boden", "wand", "papier", "stoff",
    "stahl", "korn", "staub", "zeug", "sache",
]


def get_daily_word(today: date | None = None) -> str:
    if today is None:
        today = date.today()
    seed = int(hashlib.sha256(today.isoformat().encode()).hexdigest(), 16)
    return WORD_POOL[seed % len(WORD_POOL)]


def get_daily_seed(today: date | None = None) -> int:
    if today is None:
        today = date.today()
    return int(hashlib.sha256(today.isoformat().encode()).hexdigest(), 16)
