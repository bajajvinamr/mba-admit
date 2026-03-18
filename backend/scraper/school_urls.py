"""Hardcoded MBA admissions website URLs for well-known schools.

This is faster and more reliable than Google-searching each one.
Format: partial school name → MBA admissions base URL.
"""

KNOWN_URLS: dict[str, str] = {
    # ── US Top 30 ──
    "harvard business school": "https://www.hbs.edu/mba",
    "stanford gsb": "https://www.gsb.stanford.edu",
    "wharton": "https://mba.wharton.upenn.edu",
    "chicago booth": "https://www.chicagobooth.edu",
    "kellogg": "https://www.kellogg.northwestern.edu",
    "mit sloan": "https://mitsloan.mit.edu/mba",
    "columbia business school": "https://business.columbia.edu/mba",
    "dartmouth tuck": "https://www.tuck.dartmouth.edu",
    "uc berkeley haas": "https://haas.berkeley.edu/mba",
    "duke fuqua": "https://www.fuqua.duke.edu",
    "uva darden": "https://www.darden.virginia.edu",
    "michigan ross": "https://michiganross.umich.edu/mba",
    "nyu stern": "https://www.stern.nyu.edu/programs/mba",
    "yale som": "https://som.yale.edu/programs/mba",
    "ucla anderson": "https://www.anderson.ucla.edu/mba",
    "ut austin mccombs": "https://www.mccombs.utexas.edu/mba",
    "carnegie mellon tepper": "https://www.cmu.edu/tepper/mba",
    "cornell johnson": "https://www.johnson.cornell.edu/mba",
    "unc kenan-flagler": "https://www.kenan-flagler.unc.edu/mba",
    "usc marshall": "https://www.marshall.usc.edu/mba",
    "indiana kelley": "https://kelley.iu.edu/programs/mba",
    "uw foster": "https://foster.uw.edu/academics/mba",
    "emory goizueta": "https://goizueta.emory.edu/mba",
    "washu olin": "https://olin.wustl.edu/mba",
    "georgia tech scheller": "https://scheller.gatech.edu/mba",
    "maryland smith": "https://www.rhsmith.umd.edu/mba",
    "vanderbilt owen": "https://business.vanderbilt.edu/mba",
    "texas a&m mays": "https://mays.tamu.edu/mba",
    "rice jones": "https://business.rice.edu/mba",
    "boston university questrom": "https://www.bu.edu/questrom/mba",
    "michigan state broad": "https://broad.msu.edu/mba",
    "ohio state fisher": "https://fisher.osu.edu/mba",
    "minnesota carlson": "https://carlsonschool.umn.edu/mba",
    "rochester simon": "https://simon.rochester.edu/mba",
    "syracuse whitman": "https://whitman.syracuse.edu/mba",
    "purdue krannert": "https://krannert.purdue.edu/mba",
    "florida warrington": "https://warrington.ufl.edu/mba",
    "umass isenberg": "https://www.isenberg.umass.edu/mba",
    "penn state smeal": "https://www.smeal.psu.edu/mba",
    "arizona eller": "https://eller.arizona.edu/mba",
    "smu cox": "https://www.smu.edu/cox/mba",
    "virginia tech pamplin": "https://mba.pamplin.vt.edu",
    "notre dame mendoza": "https://mendoza.nd.edu/mba",
    "georgetown mcdonough": "https://mcdonough.georgetown.edu/mba",
    "american university kogod": "https://kogod.american.edu/mba",
    "george washington": "https://business.gwu.edu/mba",
    "babson olin": "https://www.babson.edu/mba",
    "delaware lerner": "https://lerner.udel.edu/mba",
    "william & mary mason": "https://mason.wm.edu/mba",
    "lehigh college of business": "https://business.lehigh.edu/mba",
    "thunderbird": "https://thunderbird.asu.edu/mba",
    "iowa tippie": "https://tippie.uiowa.edu/mba",
    "washington foster": "https://foster.uw.edu/academics/mba",
    "pittsburgh katz": "https://business.pitt.edu/mba",
    "northeastern d'amore-mckim": "https://damore-mckim.northeastern.edu/mba",
    "temple fox": "https://www.fox.temple.edu/mba",

    # ── Europe ──
    "insead": "https://www.insead.edu/master-programmes/mba",
    "hec paris": "https://www.hec.edu/en/mba-programs/mba",
    "oxford said": "https://www.sbs.ox.ac.uk/programmes/mba",
    "cambridge judge": "https://www.jbs.cam.ac.uk/programmes/mba",
    "sda bocconi": "https://www.sdabocconi.it/en/mba",
    "imd": "https://www.imd.org/mba",
    "mannheim business school": "https://www.mannheim-business-school.com/mba",
    "university of st. gallen": "https://www.unisg.ch/en/programmes/mba",
    "imperial college business school": "https://www.imperial.ac.uk/business-school/mba",
    "warwick business school": "https://www.wbs.ac.uk/courses/mba",
    "cranfield school of management": "https://www.cranfield.ac.uk/som/mba",
    "bayes business school": "https://www.bayes.city.ac.uk/study/mba",
    "strathclyde business school": "https://www.strath.ac.uk/business/mba",
    "university of bath school of management": "https://www.bath.ac.uk/management/mba",
    "durham university business school": "https://www.dur.ac.uk/business/mba",
    "aalto university school of business": "https://www.aalto.fi/en/aalto-mba",
    "copenhagen business school": "https://www.cbs.dk/en/executive/mba",
    "stockholm school of economics": "https://www.hhs.se/en/education/mba",
    "nhh norwegian school of economics": "https://www.nhh.no/en/studies/mba",
    "nova sbe": "https://www.novasbe.pt/en/mba",
    "toulouse business school": "https://www.tbs-education.com/mba",
    "whu": "https://www.whu.edu/en/programs/mba",
    "esmt berlin": "https://esmt.berlin/mba",
    "solvay brussels school": "https://www.solvay.edu/mba",
    "ucd michael smurfit": "https://www.smurfitschool.ie/mba",
    "tilburg tias": "https://www.tias.edu/en/mba",
    "nyenrode business university": "https://www.nyenrode.nl/en/mba",
    "grenoble ecole de management": "https://en.grenoble-em.com/mba",
    "politecnico di milano": "https://www.gsom.polimi.it/mba",
    "mib trieste": "https://www.mib.edu/mba",
    "aston business school": "https://www.aston.ac.uk/abs/mba",
    "kozminski university": "https://www.kozminski.edu.pl/en/mba",

    # ── India: IIMs (beyond seeds) ──
    "iim tiruchirappalli": "https://www.iimtrichy.ac.in",
    "iim nagpur": "https://www.iimnagpur.ac.in",
    "iim bodh gaya": "https://www.iimbg.ac.in",
    "iim sambalpur": "https://www.iimsambalpur.ac.in",
    "iim jammu": "https://www.iimj.ac.in",
    "iim amritsar": "https://www.iimamritsar.ac.in",
    "iim visakhapatnam": "https://www.iimv.ac.in",
    "iim sirmaur": "https://www.iimsirmaur.ac.in",
    "iim mumbai": "https://www.iimmumbai.ac.in",

    # ── India: Others ──
    "sp jain": "https://www.spjimr.org",
    "spjimr": "https://www.spjimr.org",
    "fms delhi": "https://fms.edu",
    "mdi gurgaon": "https://www.mdi.ac.in",
    "nmims mumbai": "https://www.nmims.edu",
    "great lakes institute": "https://www.greatlakes.edu.in",
    "t.a. pai management institute": "https://www.tapmi.edu.in",
    "imt ghaziabad": "https://www.imt.edu",
    "sibm pune": "https://www.sibm.edu",
    "scmhrd": "https://www.scmhrd.edu",
    "tiss mumbai": "https://www.tiss.edu",
    "kj somaiya": "https://simsr.somaiya.edu",
    "liba chennai": "https://www.liba.edu",
    "xavier institute of management bhubaneswar": "https://www.ximb.ac.in",
    "ibs hyderabad": "https://ibsindia.org",
    "bimtech greater noida": "https://www.bimtech.ac.in",
    "imi delhi": "https://www.imi.edu",
    "welingkar institute": "https://www.welingkar.org",
    "bits pilani": "https://www.bits-pilani.ac.in",
    "iit bombay sjmsom": "https://www.som.iitb.ac.in",
    "iit delhi dms": "https://dms.iitd.ac.in",
    "iit kharagpur vgsom": "https://www.som.iitkgp.ac.in",
    "iit madras doms": "https://doms.iitm.ac.in",
    "iit kanpur": "https://www.iitk.ac.in/ime",
    "iit roorkee": "https://www.iitr.ac.in/departments/DM",
    "svkm": "https://www.nmims.edu",
    "isb": "https://www.isb.edu",
    "indian school of business": "https://www.isb.edu",
    "alliance university": "https://www.alliance.edu.in",
    "christ university": "https://christuniversity.in",
    "woxsen university": "https://woxsen.edu.in",

    # ── Asia Pacific ──
    "ceibs": "https://www.ceibs.edu/mba",
    "hkust business school": "https://mba.hkust.edu.hk",
    "nus business school": "https://mba.nus.edu.sg",
    "peking guanghua": "https://en.gsm.pku.edu.cn",
    "tsinghua sem": "https://www.sem.tsinghua.edu.cn/en",
    "shanghai jiao tong antai": "https://www.acem.sjtu.edu.cn/en",
    "hitotsubashi ics": "https://www.ics.hub.hit-u.ac.jp",
    "agsm at unsw": "https://www.unsw.edu.au/business/agsm/mba",
    "australian graduate school of management": "https://www.unsw.edu.au/business/agsm",
    "university of adelaide mba": "https://www.adelaide.edu.au/mba",
    "auckland university of technology": "https://www.aut.ac.nz/mba",
    "sungkyunkwan gsb": "https://gsb.skku.edu/eng",
    "nagoya university of commerce": "https://www.nucba.ac.jp/en",
    "sasin school of management": "https://www.sasin.edu",
    "asian institute of management": "https://www.aim.edu",
    "sp jain school of global management": "https://www.spjain.org",
    "sunway university business school": "https://university.sunway.edu.my/mba",
    "mahidol university cmmu": "https://www.cmmu.mahidol.ac.th",
    "de la salle university": "https://www.dlsu.edu.ph",

    # ── Africa + Middle East ──
    "gordon institute of business science": "https://www.gibs.co.za",
    "uct gsb": "https://www.gsb.uct.ac.za",
    "stellenbosch business school": "https://www.usb.ac.za",
    "american university in dubai": "https://www.aud.edu",
    "insead abu dhabi": "https://www.insead.edu/campuses/abu-dhabi",
    "kfupm college of business": "https://www.kfupm.edu.sa/cob",
    "koc university gsb": "https://gsb.ku.edu.tr",
    "bilkent university mba": "https://www.bilkent.edu.tr/mba",
    "bogazici university mba": "https://www.boun.edu.tr/mba",
    "technion mba": "https://www.technion.ac.il/en/mba",
    "tel aviv university mba": "https://en-coller.tau.ac.il/mba",
    "hebrew university mba": "https://en.business.huji.ac.il/mba",

    # ── Canada ──
    "rotman": "https://www.rotman.utoronto.ca/mba",
    "ivey business school": "https://www.ivey.uwo.ca/mba",
    "mcgill desautels": "https://www.mcgill.ca/desautels/mba",
    "ubc sauder": "https://www.sauder.ubc.ca/mba",
    "smith school of business": "https://smith.queensu.ca/mba",
    "york schulich": "https://schulich.yorku.ca/mba",
    "calgary haskayne": "https://haskayne.ucalgary.ca/mba",
    "alberta school of business": "https://www.ualberta.ca/business/mba",

    # ── Alternate spellings / special characters ──
    "unc kenanflagler": "https://www.kenan-flagler.unc.edu/mba",
    "kenanflagler": "https://www.kenan-flagler.unc.edu/mba",
    "northeastern damoremckim": "https://damore-mckim.northeastern.edu/mba",
    "damoremckim": "https://damore-mckim.northeastern.edu/mba",
    "oxford said": "https://www.sbs.ox.ac.uk/programmes/mba",
    "said business school": "https://www.sbs.ox.ac.uk/programmes/mba",
    "said business school  mena programs": "https://www.sbs.ox.ac.uk/programmes/mba",
    "central european management institute": "https://www.cemi.cz/mba",
    "cemi": "https://www.cemi.cz/mba",
    "iag pucrio": "https://iag.puc-rio.br/en/mba",
    "vnu university of economics and business": "https://ueb.vnu.edu.vn/en",

    # ── Latin America ──
    "egade business school": "https://egade.tec.mx/en/mba",
    "insper": "https://www.insper.edu.br/en/mba",
    "iag puc-rio": "https://iag.puc-rio.br/en/mba",
    "coppead ufrj": "https://www.coppead.ufrj.br/en/mba",
    "fundacao dom cabral": "https://www.fdc.org.br/mba",
    "universidad adolfo ibanez": "https://www.uai.cl/mba",
    "esan graduate school": "https://www.esan.edu.pe/mba",
    "universidad torcuato di tella": "https://www.utdt.edu/mba",
    "universidad de los andes": "https://administracion.uniandes.edu.co/mba",
    "eafit university": "https://www.eafit.edu.co/mba",
    "itam": "https://www.itam.mx/mba",
    "fgv eaesp": "https://eaesp.fgv.br/en/mba",

    # ── Top European (additions) ──
    "london business school": "https://www.london.edu/programmes/mba",
    "lbs": "https://www.london.edu/programmes/mba",
    "ie business school": "https://www.ie.edu/business-school/programs/mba",
    "ie university": "https://www.ie.edu/business-school/programs/mba",
    "esade": "https://www.esade.edu/en/programmes/mbas/full-time-mba",
    "iese business school": "https://www.iese.edu/mba",
    "iese": "https://www.iese.edu/mba",
    "london school of economics": "https://www.lse.ac.uk/study-at-lse/graduate/mba",
    "essec business school": "https://www.essec.edu/en/program/global-mba",
    "essec": "https://www.essec.edu/en/program/global-mba",
    "emlyon business school": "https://em-lyon.com/en/global-mba",
    "edhec business school": "https://www.edhec.edu/en/programmes/mba",
    "ieseg school of management": "https://www.ieseg.fr/en/programs/mba",
    "ehl": "https://www.ehl.edu/en/programmes/mba",
    "vlerick business school": "https://www.vlerick.com/en/programmes/mba",
    "rotterdam school of management": "https://www.rsm.nl/mba",
    "rsm erasmus": "https://www.rsm.nl/mba",

    # ── India: Top IIMs (missing from above) ──
    "iim ahmedabad": "https://www.iima.ac.in",
    "iima": "https://www.iima.ac.in",
    "iim bangalore": "https://www.iimb.ac.in",
    "iimb": "https://www.iimb.ac.in",
    "iim calcutta": "https://www.iimcal.ac.in",
    "iimc": "https://www.iimcal.ac.in",
    "iim lucknow": "https://www.iiml.ac.in",
    "iiml": "https://www.iiml.ac.in",
    "iim kozhikode": "https://www.iimk.ac.in",
    "iimk": "https://www.iimk.ac.in",
    "iim indore": "https://www.iimidr.ac.in",
    "iimi": "https://www.iimidr.ac.in",
    "iim shillong": "https://www.iimshillong.ac.in",
    "iim ranchi": "https://www.iimranchi.ac.in",
    "iim raipur": "https://www.iimraipur.ac.in",
    "iim rohtak": "https://www.iimrohtak.ac.in",
    "iim kashipur": "https://www.iimkashipur.ac.in",
    "iim udaipur": "https://www.iimu.ac.in",
    "xlri jamshedpur": "https://www.xlri.ac.in",
    "xlri": "https://www.xlri.ac.in",

    # ── Asia Pacific (additions) ──
    "nanyang business school": "https://www.ntu.edu.sg/business/admissions/graduate/nanyang-mba",
    "ntu nanyang": "https://www.ntu.edu.sg/business/admissions/graduate/nanyang-mba",
    "fudan university": "https://www.fdsm.fudan.edu.cn/en/mba",
    "university of hong kong": "https://www.hkubs.hku.hk/mba",
    "hku business school": "https://www.hkubs.hku.hk/mba",
    "melbourne business school": "https://mbs.edu/degree-programs/mba",
    "monash business school": "https://www.monash.edu/business/mba",
    "macquarie business school": "https://www.mq.edu.au/study/find-a-course/courses/master-of-business-administration",
    "korea university business school": "https://biz.korea.ac.kr/en/mba",
    "yonsei university school of business": "https://ysb.yonsei.ac.kr/mba",
    "waseda business school": "https://www.waseda.jp/fcom/wbs/en",
    "keio business school": "https://www.kbs.keio.ac.jp/en",
    "indian school of business hyderabad": "https://www.isb.edu/en/study-isb/pgp",

    # ── US additions (top 50 fill-ins) ──
    "brigham young marriott": "https://marriottschool.byu.edu/mba",
    "byu marriott": "https://marriottschool.byu.edu/mba",
    "wisconsin school of business": "https://business.wisc.edu/mba",
    "rutgers business school": "https://www.business.rutgers.edu/mba",
    "uconn school of business": "https://mba.business.uconn.edu",
    "case western weatherhead": "https://weatherhead.case.edu/mba",
    "tulane freeman": "https://freeman.tulane.edu/mba",
    "wake forest school of business": "https://business.wfu.edu/mba",
    "boston college carroll": "https://www.bc.edu/content/bc-web/schools/carroll-school/graduate/mba.html",
    "asu wpcarey": "https://wpcarey.asu.edu/mba-programs",
    "uci merage": "https://merage.uci.edu/programs/mba",
    "fordham gabelli": "https://www.fordham.edu/gabelli-school-of-business/academic-programs/graduate-programs/mba",
}


def match_school_url(school_name: str) -> str | None:
    """Fuzzy-match a school name to a known URL.

    Tries exact normalized match first, then substring matching.
    """
    import re
    import unicodedata
    norm = school_name.lower().strip()
    # Normalize unicode (ï → i, é → e, etc.)
    norm = unicodedata.normalize("NFKD", norm).encode("ascii", "ignore").decode()
    norm = re.sub(r"[^a-z0-9\s&]", "", norm).strip()

    # Exact match
    if norm in KNOWN_URLS:
        return KNOWN_URLS[norm]

    # Substring match (check if any known key is contained in the name or vice versa)
    for key, url in KNOWN_URLS.items():
        if key in norm or norm in key:
            return url

    # Word overlap match (>70% of words match)
    norm_words = set(norm.split())
    for key, url in KNOWN_URLS.items():
        key_words = set(key.split())
        if len(norm_words & key_words) / max(len(norm_words), len(key_words), 1) > 0.6:
            return url

    return None
