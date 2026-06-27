"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import type { MapContent } from "@/types"

// ISO alpha-2 → ISO numeric (Natural Earth ids used by world-atlas)
const ISO2_TO_NUMERIC: Record<string, string> = {
  AD: "020", AE: "784", AF: "004", AG: "028", AL: "008", AM: "051", AO: "024",
  AR: "032", AT: "040", AU: "036", AZ: "031", BA: "070", BB: "052", BD: "050",
  BE: "056", BF: "854", BG: "100", BH: "048", BI: "108", BJ: "204", BN: "096",
  BO: "068", BR: "076", BS: "044", BT: "064", BW: "072", BY: "112", BZ: "084",
  CA: "124", CD: "180", CF: "140", CG: "178", CH: "756", CI: "384", CL: "152",
  CM: "120", CN: "156", CO: "170", CR: "188", CU: "192", CV: "132", CY: "196",
  CZ: "203", DE: "276", DJ: "262", DK: "208", DO: "214", DZ: "012", EC: "218",
  EE: "233", EG: "818", ER: "232", ES: "724", ET: "231", FI: "246", FJ: "242",
  FR: "250", GA: "266", GB: "826", GE: "268", GH: "288", GM: "270", GN: "324",
  GQ: "226", GR: "300", GT: "320", GW: "624", GY: "328", HN: "340", HR: "191",
  HT: "332", HU: "348", ID: "360", IE: "372", IL: "376", IN: "356", IQ: "368",
  IR: "364", IS: "352", IT: "380", JM: "388", JO: "400", JP: "392", KE: "404",
  KG: "417", KH: "116", KI: "296", KM: "174", KP: "408", KR: "410", KW: "414",
  KZ: "398", LA: "418", LB: "422", LC: "662", LI: "438", LK: "144", LR: "430",
  LS: "426", LT: "440", LU: "442", LV: "428", LY: "434", MA: "504", MC: "492",
  MD: "498", ME: "499", MG: "450", MK: "807", ML: "466", MM: "104", MN: "496",
  MR: "478", MT: "470", MU: "480", MV: "462", MW: "454", MX: "484", MY: "458",
  MZ: "508", NA: "516", NE: "562", NG: "566", NI: "558", NL: "528", NO: "578",
  NP: "524", NR: "520", NZ: "554", OM: "512", PA: "591", PE: "604", PG: "598",
  PH: "608", PK: "586", PL: "616", PT: "620", PW: "585", PY: "600", QA: "634",
  RO: "642", RS: "688", RU: "643", RW: "646", SA: "682", SB: "090", SC: "690",
  SD: "729", SE: "752", SG: "702", SI: "705", SK: "703", SL: "694", SM: "674",
  SN: "686", SO: "706", SR: "740", SS: "728", ST: "678", SV: "222", SY: "760",
  SZ: "748", TD: "148", TG: "768", TH: "764", TJ: "762", TL: "626", TM: "795",
  TN: "788", TO: "776", TR: "792", TT: "780", TV: "798", TZ: "834", UA: "804",
  UG: "800", US: "840", UY: "858", UZ: "860", VC: "670", VE: "862", VN: "704",
  VU: "548", WS: "882", YE: "887", ZA: "710", ZM: "894", ZW: "716",
}

const GEO_URL = "/geo/countries-110m.json"

export default function MapBlock({ content }: { content: MapContent }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  const highlightIds = new Set(content.countries.map(c => ISO2_TO_NUMERIC[c.toUpperCase()]).filter(Boolean))

  return (
    <section className="w-full py-20" ref={ref}>
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center gap-4 mb-12">
          {content.label && (
            <span className="font-mono text-xs text-amber uppercase tracking-widest">{content.label}</span>
          )}
          <div className="rule-amber flex-1" />
        </div>

        <motion.div
          className="w-full border border-border/40 relative overflow-hidden"
          style={{ aspectRatio: "16/7" }}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Corner marks */}
          <span className="absolute top-0 left-0  w-4 h-px bg-amber/40 z-10" />
          <span className="absolute top-0 left-0  w-px h-4 bg-amber/40 z-10" />
          <span className="absolute top-0 right-0 w-4 h-px bg-amber/40 z-10" />
          <span className="absolute top-0 right-0 w-px h-4 bg-amber/40 z-10" />
          <span className="absolute bottom-0 left-0  w-4 h-px bg-amber/40 z-10" />
          <span className="absolute bottom-0 left-0  w-px h-4 bg-amber/40 z-10" />
          <span className="absolute bottom-0 right-0 w-4 h-px bg-amber/40 z-10" />
          <span className="absolute bottom-0 right-0 w-px h-4 bg-amber/40 z-10" />

          <ComposableMap
            projection="geoMercator"
            style={{ width: "100%", height: "100%", background: "transparent" }}
          >
            <ZoomableGroup
              center={content.center}
              zoom={content.scale / 150}
              disablePanning
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const isHighlighted = highlightIds.has(geo.id as string)
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isHighlighted ? "rgba(242,132,60,0.18)" : "rgba(242,132,60,0.04)"}
                        stroke="#F2843C"
                        strokeWidth={isHighlighted ? 0.6 : 0.3}
                        strokeOpacity={isHighlighted ? 0.5 : 0.15}
                        style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                      />
                    )
                  })
                }
              </Geographies>

            </ZoomableGroup>
          </ComposableMap>
        </motion.div>
      </div>
    </section>
  )
}
