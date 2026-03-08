import { addKnowledge } from "./engine";
import type { NewKnowledgeEntry } from "@/lib/db/schema";

type KnowledgeInput = Omit<NewKnowledgeEntry, "id" | "createdAt">;

const entries: KnowledgeInput[] = [
  // =======================================
  // EPSTEIN NETWORK: ACTORS & CONNECTIONS
  // =======================================
  {
    title: "Jeffrey Epstein - Network Profile & Intelligence Connections",
    content: `Jeffrey Epstein (1953-2019) was an American financier and convicted sex trafficker who operated an influence network spanning finance, politics, academia, and royalty. His network is significant for geopolitical analysis because of documented connections to intelligence actors and state-level protection mechanisms.

Key facts from DOJ Epstein Library (released January 30, 2026 under Epstein Files Transparency Act, Public Law 119-38):
- DOJ identified 6 million pages of responsive documents
- 3.5 million pages released along with 180,000 images and 2,000 videos
- ~200,000 pages redacted on privilege grounds
- More than 500 attorneys worked on the document review
- Giuffre family noted DOJ redacted perpetrator names while leaving victims identifiable

2008 Non-Prosecution Agreement: Despite FBI identifying dozens of underage victims, Epstein pled guilty to a state charge and received 18 months with work release. The agreement granted immunity to unnamed co-conspirators, shielding the broader network. Draft federal indictment (now released) shows prosecutors had been preparing charges against Epstein and three associates before intervention.

Alexander Acosta (US Attorney who signed the plea deal) reportedly told the Trump transition team during his Labor Secretary confirmation that Epstein "belonged to intelligence" and to "leave it alone" (reported by Vicky Ward, The Daily Beast, 2019).

Financial activities: Managed money for Les Wexner (L Brands). Claimed to manage only billionaire clients. Exact source of wealth remains unclear. Operated through entities registered in US Virgin Islands.`,
    category: "actor",
    tags: JSON.stringify(["epstein", "intelligence", "leverage", "network", "trafficking", "doj", "acosta", "non-prosecution"]),
    source: "DOJ Epstein Library (Data Sets 9, 11), Epstein Files Transparency Act, Vicky Ward/Daily Beast",
    confidence: 0.92,
    status: "active",
    metadata: JSON.stringify({
      type: "actor-profile",
      network: "epstein",
      connections: ["ghislaine-maxwell", "robert-maxwell", "ehud-barak", "les-wexner", "alexander-acosta"],
      keyDates: {
        arrest2008: "2008",
        pleaDeal: "2008",
        arrest2019: "2019-07-06",
        death: "2019-08-10",
        filesAct: "2025-11-19",
        filesRelease: "2026-01-30",
      },
      documentScale: {
        totalPages: 6000000,
        releasedPages: 3500000,
        redactedPages: 200000,
        images: 180000,
        videos: 2000,
      },
    }),
  },
  {
    title: "Robert Maxwell - Intelligence Ties & Israel Connection",
    content: `Robert Maxwell (1923-1991) was a Czechoslovak-born British media tycoon, Labour MP, and publisher (Mirror Group Newspapers, Pergamon Press). Father of Ghislaine Maxwell. Died November 1991 after falling from his yacht, the Lady Ghislaine, off the Canary Islands.

Post-death revelations: Over 400 million GBP found missing from employees' pension funds.

Israel connection (documented):
- Buried on the Mount of Olives in Jerusalem with Israeli state honors
- PM Yitzhak Shamir delivered the eulogy: "He has done more for Israel than can today be said"
- Funeral attended by multiple Israeli intelligence figures
- British Foreign Office had long suspected Maxwell of intelligence ties to MI6, KGB, and Mossad

Epstein's own emails (DOJ Data Set 9, released January 2026) describe Maxwell's Mossad relationship as established fact. In a 2018 email, Epstein wrote that Maxwell had threatened Israel's intelligence service, telling Mossad that "unless they gave him 400 million GBP to save his crumbling empire, he would expose all he had done for them."

Gordon Thomas's book "Robert Maxwell, Israel's Superspy" documented Maxwell's alleged role in the sale of modified PROMIS software (intelligence-gathering tool) to governments worldwide on behalf of Mossad.

Analytical significance: The Shamir eulogy, Mount of Olives burial, and pension fund theft are all documented facts. Together they establish a pattern where a media mogul with confirmed intelligence suspicions received state honors from the country whose intelligence service he allegedly served.`,
    category: "actor",
    tags: JSON.stringify(["maxwell", "mossad", "israel", "intelligence", "promis", "epstein-network", "media"]),
    source: "DOJ Epstein Library Data Set 9, BBC House of Maxwell (2022), Gordon Thomas, Times of Israel",
    confidence: 0.90,
    status: "active",
    metadata: JSON.stringify({
      type: "actor-profile",
      network: "epstein",
      connections: ["ghislaine-maxwell", "jeffrey-epstein", "mossad", "yitzhak-shamir"],
      keyFacts: {
        pensionTheft: "400M GBP",
        burial: "Mount of Olives, Jerusalem",
        shamirQuote: "He has done more for Israel than can today be said",
        intelligenceSuspicions: ["MI6", "KGB", "Mossad"],
      },
    }),
  },
  {
    title: "Ghislaine Maxwell - Recruitment Network & Conviction",
    content: `Ghislaine Maxwell (born 1961) is the youngest daughter of Robert Maxwell. She became Jeffrey Epstein's closest associate after meeting him around 1990, shortly before her father's death.

After Robert Maxwell died, Epstein reportedly helped the Maxwell estate hide assets in offshore accounts (documented in BBC's 2022 documentary series "House of Maxwell").

Role in network: Recruited and groomed underage girls for Epstein's trafficking operation. Acted as the primary intermediary between Epstein and his social circle, providing social legitimacy and access to elite networks.

Conviction: Found guilty December 2021 of sex trafficking of a minor and four other counts. Sentenced to 20 years in federal prison. Currently serving sentence.

Analytical significance: Ghislaine represents the operational bridge between Robert Maxwell's intelligence world and Epstein's influence network. Her social positioning in New York and London elite circles was the mechanism through which Epstein accessed politicians, academics, royalty, and business leaders.`,
    category: "actor",
    tags: JSON.stringify(["maxwell", "epstein-network", "trafficking", "recruitment", "convicted"]),
    source: "DOJ records, BBC House of Maxwell, court proceedings",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "actor-profile",
      network: "epstein",
      connections: ["jeffrey-epstein", "robert-maxwell"],
      conviction: "December 2021, 20 years federal prison",
    }),
  },
  {
    title: "Ehud Barak - Epstein Financial & Personal Connections",
    content: `Ehud Barak, former Israeli Prime Minister (1999-2001) and Defense Minister, had extensive documented contact with Jeffrey Epstein after Epstein's 2008 conviction.

Documented meetings: Approximately 36 meetings between 2013 and 2017 (roughly once per month for four years). All occurred after Epstein's 2008 conviction for soliciting prostitution from a minor was public knowledge.

2017 incident: After visiting Epstein's Manhattan apartment, Barak was photographed leaving the building with his face covered, apparently trying to avoid surveillance cameras. He later acknowledged the visits but denied any wrongdoing.

Financial connections:
- Received $2.5 million through a charitable foundation from Epstein
- Epstein invested in Carbyne, a startup Barak co-founded developing emergency call-handling technology

Analytical framework: A former head of state accepting this level of reputational risk (36 visits to a convicted sex offender, $2.5M in financial ties) suggests the relationship's value exceeded the cost. For someone who already has wealth, power, and status, the relationships that generate that kind of value typically provide access, protection, or leverage that those assets alone cannot buy.`,
    category: "actor",
    tags: JSON.stringify(["barak", "israel", "epstein-network", "political", "financial-ties", "carbyne"]),
    source: "Al Jazeera Feb 2026, Electronic Intifada, media reporting",
    confidence: 0.88,
    status: "active",
    metadata: JSON.stringify({
      type: "actor-profile",
      network: "epstein",
      connections: ["jeffrey-epstein", "carbyne"],
      meetings: 36,
      meetingPeriod: "2013-2017",
      financialTies: "$2.5M via charitable foundation + Carbyne investment",
    }),
  },

  // =======================================
  // STRUCTURAL MODELS & FRAMEWORKS
  // =======================================
  {
    title: "Leverage Architecture - Epstein Network as Influence System",
    content: `The Epstein network, as documented in the DOJ files, represents what can be analytically described as a leverage architecture: a system that accumulates compromising material on powerful people while maintaining institutional connections that provide protection.

Components of the leverage architecture:
1. PERSONAL LEVERAGE: Compromising material on individuals across politics, business, academia, and royalty. The threat of exposure functions as the mechanism - the file existing IS the leverage. It works whether or not anyone opens it.
2. FINANCIAL LEVERAGE: Capital flows to military and settlement organizations (Friends of the IDF, Jewish National Fund) create institutional dependency. Funding creates alignment.
3. PROTECTION MECHANISMS: Non-prosecution agreements, blanket immunity for co-conspirators, redaction patterns that protect perpetrators. These are not failures of the system - they are the system functioning as designed.
4. INFORMATION CONTROL: 6 million pages identified, 3.5 million released, 200,000 redacted. The redaction pattern (protecting perpetrators, exposing victims) reveals institutional priorities.
5. CLASSIFICATION DEFENSE: Examination of documented connections triggers reclassification of the analyst (conspiracy theorist, antisemite) rather than engagement with evidence. This is a kill switch that shuts down inquiry.

This model applies beyond the Epstein case to understanding how influence networks maintain power across decades: accumulate leverage on individuals, connect to state interests, protect through institutional mechanisms, and make the cost of examination prohibitively high.`,
    category: "model",
    tags: JSON.stringify(["leverage", "epstein-network", "influence", "power-structure", "intelligence", "blackmail", "institutional-protection"]),
    source: "Analysis based on DOJ Epstein Library, Epstein Files Transparency Act",
    confidence: 0.80,
    status: "active",
    metadata: JSON.stringify({
      type: "structural-model",
      network: "epstein",
      components: ["personal-leverage", "financial-leverage", "protection-mechanisms", "information-control", "classification-defense"],
    }),
  },
  {
    title: "Epstein Network - Financial Flows & Organizational Ties",
    content: `Documented financial connections between the Epstein network and Israeli state/military organizations:

1. Friends of the Israeli Defence Forces (FIDF): Epstein made documented donations. FIDF supports IDF soldiers and their families. This represents a direct financial connection between the trafficking network and Israel's military apparatus.

2. Jewish National Fund (JNF/KKL): Epstein funded this organization, which has been central to settlement expansion and land acquisition in occupied territories. JNF holds approximately 13% of land in Israel and has been involved in demolition of Palestinian villages for development projects.

3. Carbyne (emergency tech startup): Co-founded by Ehud Barak. Received investment from Epstein. Develops emergency call-handling technology. Notable investors also included Peter Thiel's Founders Fund. The company's technology has potential dual-use applications in surveillance.

4. Les Wexner/L Brands connection: Epstein managed Wexner's finances and received a Manhattan townhouse worth approximately $77 million. Wexner was the primary source of Epstein's documented wealth. Wexner also donated extensively to Israeli causes and was chairman of the Mega Group (informal gathering of wealthy American Jewish philanthropists).

These financial flows are significant because they connect a trafficking network to military organizations, settlement infrastructure, and surveillance technology, creating institutional relationships that may explain the extraordinary protections the network received.`,
    category: "market",
    tags: JSON.stringify(["epstein-network", "financial-flows", "fidf", "jnf", "carbyne", "wexner", "settlement", "military-funding"]),
    source: "DOJ Epstein Library Data Set 11, Al Jazeera, Electronic Intifada, court records",
    confidence: 0.85,
    status: "active",
    metadata: JSON.stringify({
      type: "financial-analysis",
      network: "epstein",
      organizations: ["FIDF", "JNF", "Carbyne", "L Brands"],
      keyFigures: ["Les Wexner", "Ehud Barak", "Peter Thiel"],
    }),
  },
  {
    title: "PROMIS Software - Intelligence Tool Distribution Network",
    content: `PROMIS (Prosecutors Management Information System) was originally developed by Inslaw Inc. for the US Department of Justice in the early 1980s. The software was allegedly stolen and modified by intelligence agencies to include backdoor surveillance capabilities, then sold to foreign governments.

Robert Maxwell's alleged role: According to Gordon Thomas (Robert Maxwell, Israel's Superspy) and investigative journalist sources, Maxwell acted as Mossad's front man for distributing modified PROMIS software to intelligence agencies and governments worldwide. The modified version reportedly contained a backdoor that allowed Israeli intelligence to monitor the data processed by foreign governments using the software.

Inslaw's Bill Hamilton fought a decades-long legal battle claiming the DOJ stole PROMIS. Multiple investigations confirmed Inslaw's claims had merit, but no restitution was made. A 1991 congressional report found that the DOJ had "taken, converted, and stolen" the software.

Significance: If the PROMIS allegations are accurate, they represent an early model of the same intelligence architecture later attributed to the Epstein network: using commercial/civilian cover to create surveillance capabilities over foreign governments, with Robert Maxwell as the distribution mechanism and Israel as the beneficiary.

Caveat: While the Inslaw theft is well-documented, the specific claim about Maxwell distributing backdoored PROMIS remains alleged and unconfirmed by any intelligence agency.`,
    category: "technical",
    tags: JSON.stringify(["promis", "intelligence", "surveillance", "maxwell", "mossad", "inslaw", "software-backdoor"]),
    source: "Gordon Thomas, Congressional investigations, Inslaw v. DOJ proceedings",
    confidence: 0.65,
    status: "active",
    metadata: JSON.stringify({
      type: "intelligence-tool",
      network: "epstein",
      era: "1980s-1990s",
      allegationStatus: "documented-but-unconfirmed",
      connections: ["robert-maxwell", "mossad", "doj"],
    }),
  },
  {
    title: "Epstein Files - Document Release Timeline & Redaction Analysis",
    content: `Timeline of Epstein document releases and their analytical significance:

TIMELINE:
- 2008: Non-prosecution agreement signed by Alexander Acosta. Epstein pleads to state charge, 18 months with work release.
- 2019 July 6: Epstein arrested on federal sex trafficking charges.
- 2019 August 10: Epstein found dead in Metropolitan Correctional Center. Ruled suicide.
- 2021 December: Ghislaine Maxwell convicted on 5 counts including sex trafficking.
- 2025 November 19: Trump signs Epstein Files Transparency Act (Public Law 119-38).
- 2026 January 30: DOJ releases first tranche: 3.5 million pages, 180,000 images, 2,000 videos.
- 2026 February: Ongoing releases and analysis.

DOCUMENT STRUCTURE:
- Data Set 9: Email correspondence (contains Epstein's own statements about Maxwell/Mossad relationship)
- Data Set 11: Financial records and flight manifests
- Total identified: 6 million pages
- Released: 3.5 million pages
- Redacted: ~200,000 pages on privilege grounds
- Unreleased: ~2.5 million pages

REDACTION PATTERN ANALYSIS:
The Giuffre family (Virginia Giuffre, one of Epstein's most vocal accusers who died by suicide in 2025) identified an asymmetry: the DOJ redacted names of perpetrators while leaving victims identifiable. This inverts the stated purpose of the Transparency Act and reveals institutional priorities - protecting the network rather than the victims.

TIMING SIGNIFICANCE:
The January 2026 release coincided with escalating Iran military operations, Temple Mount access normalization, and settlement expansion. Whether intentional or not, the effect is reduced public scrutiny of the file contents during a period of competing geopolitical crises.`,
    category: "event",
    tags: JSON.stringify(["epstein-files", "doj", "transparency", "redaction", "timeline", "document-release"]),
    source: "DOJ Epstein Library, CBS News Jan 2026, PBS News Jan 2026, Ro Khanna Congressional statements",
    confidence: 0.95,
    status: "active",
    metadata: JSON.stringify({
      type: "event-timeline",
      network: "epstein",
      keyDates: {
        actSigned: "2025-11-19",
        firstRelease: "2026-01-30",
      },
      documentStats: {
        totalIdentified: 6000000,
        released: 3500000,
        redacted: 200000,
        unreleased: 2500000,
      },
    }),
  },
  {
    title: "Power Incentive Model - Why Elites Accept Reputational Risk",
    content: `Analytical framework for understanding why powerful individuals maintain relationships with compromised networks despite obvious reputational risk.

THE COST-BENEFIT CALCULATION:
When a former head of state (Barak), members of royalty (Prince Andrew), academic leaders (multiple university presidents), and billionaires maintain contact with a convicted sex offender, the standard explanation ("they didn't know") fails at scale. At some point, the pattern requires a structural explanation rather than individual ones.

WHAT EXCEEDS REPUTATIONAL COST:
For individuals who already have wealth, power, and status, only specific categories of value justify accepting association risk:
1. ACCESS: To people, information, or networks unavailable through legitimate channels
2. PROTECTION: From exposure of existing compromising behavior
3. LEVERAGE: Over others in the network (mutual assured destruction)
4. INSTITUTIONAL BACKING: State or intelligence support that provides immunity from consequences

THE NETWORK EFFECT:
Once an individual is compromised within a leverage network, they have a rational incentive to:
- Maintain the relationship (leaving creates risk of exposure)
- Recruit others (expanding the network dilutes individual risk)
- Protect the network operator (the operator's exposure threatens all participants)
- Support institutional mechanisms that prevent disclosure (redactions, sealed records, intelligence classification)

This creates a self-reinforcing system where the network grows more powerful and more protected over time, because every participant has a personal stake in its continued operation.

APPLICATION: This model explains why the Epstein network received extraordinary legal protections, why co-conspirators received blanket immunity, why 2.5 million pages remain unreleased, and why examination of the network triggers institutional defense mechanisms rather than investigation.`,
    category: "model",
    tags: JSON.stringify(["incentive-model", "power-structure", "leverage", "epstein-network", "reputational-risk", "network-effect"]),
    source: "Structural analysis based on documented patterns in DOJ Epstein Library",
    confidence: 0.75,
    status: "active",
    metadata: JSON.stringify({
      type: "analytical-model",
      network: "epstein",
      applicableTo: ["intelligence-networks", "elite-capture", "institutional-protection"],
    }),
  },
];

export async function ingestEpsteinNetwork(): Promise<{ count: number }> {
  let count = 0;
  for (const entry of entries) {
    try {
      await addKnowledge(entry);
      count++;
    } catch (err) {
      console.error(`[epstein-ingest] Failed to add "${entry.title}":`, err);
    }
  }
  console.log(`[epstein-ingest] Ingested ${count}/${entries.length} entries`);
  return { count };
}
