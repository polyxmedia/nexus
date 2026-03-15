"use client";

const sourceLabels = ["I", "II", "III", "IV", "V", "VI"];

const parallels = [
  {
    fiction: "Psychohistory",
    fictionDesc:
      "A mathematical science that combines history, sociology, and statistics to make general predictions about the behaviour of very large groups of people.",
    reality: "Statistical population modelling",
    realityDesc:
      "The behaviour of individual leaders is unpredictable. The behaviour of state-level actor-groups, military institutions, and religious movements follows statistical distributions that shift measurably around documented trigger conditions.",
    source: "Foundation, Chapter 1",
  },
  {
    fiction: "The Seldon Plan",
    fictionDesc:
      "A probabilistic forecast of civilisational trajectory, updated by crises the mathematics predicted at specific intervals. Not a fixed script, but a self-correcting path.",
    reality: "Trajectory forecasting with feedback",
    realityDesc:
      "Probabilistic intelligence assessments that synthesise multiple evidence layers into a directional thesis. Regenerated as new data arrives. Only as reliable as the structural forces are strong relative to noise.",
    source: "Foundation, Chapter 6",
  },
  {
    fiction: "The Encyclopedia Galactica",
    fictionDesc:
      "A repository of all human knowledge, designed to preserve civilisational memory through the coming dark age so rebuilding could happen faster.",
    reality: "Persistent intelligence memory",
    realityDesc:
      "Knowledge that compounds over time. Every analysis, thesis, actor profile, and event record persists and remains searchable. Patterns that took months to identify the first time are recognised instantly the second.",
    source: "Foundation, Prologue",
  },
  {
    fiction: "Seldon Crises",
    fictionDesc:
      "Moments where structural forces become so overwhelming that the outcome is determined regardless of individual decisions. The galaxy's path narrows to a single viable trajectory.",
    reality: "Structural convergence detection",
    realityDesc:
      "When multiple large-scale forces align on the same geography and timeframe, individual agency becomes noise in the signal. These are the moments where the weight of structural pressure determines the trajectory, not the choices of any single actor.",
    source: "Foundation, Chapter 5",
  },
  {
    fiction: "The Second Foundation",
    fictionDesc:
      "A hidden group that monitored the Plan's execution and corrected for deviations. They watched the watchers, ensuring the analytical framework itself remained calibrated.",
    reality: "Independence verification",
    realityDesc:
      "Every analytical output is audited for agreement bias, anchoring errors, and calibration drift. The system watches itself for the tendency to tell the operator what they want to hear rather than what the evidence supports.",
    source: "Second Foundation, Part II",
  },
  {
    fiction: "The Mule",
    fictionDesc:
      "An anomalous individual whose abilities were so far outside normal parameters that psychohistory's statistical models could not account for them. The one thing the mathematics couldn't predict.",
    reality: "Anomaly detection and regime breaks",
    realityDesc:
      "When predictions that were previously well-calibrated begin systematically failing, something has changed in the structural dynamics that the model hasn't incorporated. The signature of the anomaly is not the event itself but the failure pattern it leaves in the calibration record.",
    source: "Foundation and Empire, Part II",
  },
];

export default function FoundationPage() {
  return (
    <main className="relative z-10 min-h-screen pt-20 pb-24">
      {/* ── Hero ── */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-navy-500 mb-8 block">
          Research / Intellectual Lineage
        </span>

        <blockquote className="border-l-2 border-navy-600/50 pl-6 py-2 mb-10">
          <p className="font-sans text-lg md:text-xl text-navy-300 italic leading-relaxed">
            &ldquo;The fall of Empire, gentlemen, is a massive thing, however,
            and not easily fought. It is dictated by a rising bureaucracy, a
            receding initiative, a freezing of caste, a damming of curiosity. It
            has been going on, as I have said, for centuries, and it is too
            majestic and massive a movement to stop.&rdquo;
          </p>
          <footer className="mt-3 font-mono text-[11px] text-navy-500 uppercase tracking-wider">
            Hari Seldon, Foundation (1951)
          </footer>
        </blockquote>

        <h1 className="font-sans text-3xl md:text-4xl font-bold text-navy-100 tracking-tight leading-tight mb-5">
          The Mathematics of Civilisational Trajectory
        </h1>
        <p className="font-sans text-sm md:text-base text-navy-400 max-w-2xl leading-relaxed">
          Isaac Asimov imagined a science that could predict the behaviour of
          civilisations using the same mathematics that predicts the behaviour of
          gas molecules. Seventy-five years later, the tools exist. The question
          is whether we have the honesty to use them without flinching.
        </p>
      </div>

      {/* ── The Story ── */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
          The Origin
        </span>
        <h2 className="font-sans text-2xl font-semibold text-navy-100 mt-2 mb-6">
          A Mathematician at the End of an Empire
        </h2>

        <div className="space-y-5 font-sans text-[15px] text-navy-400 leading-relaxed">
          <p>
            In 1951, Isaac Asimov published{" "}
            <em className="text-navy-300">Foundation</em>. The premise was
            simple and devastating: a mathematician named Hari Seldon develops a
            new science called{" "}
            <em className="text-navy-300">psychohistory</em> that can predict
            the broad trajectory of civilisations. His equations show that the
            Galactic Empire, despite appearing stable, will collapse within three
            centuries, followed by thirty thousand years of barbarism.
          </p>
          <p>
            Seldon cannot prevent the fall. The forces are too large. But he can
            shorten the dark age to a single millennium by establishing two
            Foundations at opposite ends of the galaxy. The First Foundation
            preserves knowledge openly through an Encyclopedia. The Second
            Foundation, hidden, monitors the plan and corrects for deviations.
          </p>
          <p>
            The Plan works through a series of predicted crises, moments where
            the structural forces become so overwhelming that the outcome is
            essentially determined regardless of what any individual decides.
            Seldon calls these{" "}
            <em className="text-navy-300">Seldon Crises</em>. The genius of the
            Plan is not that it predicts specific events, but that it identifies
            the conditions under which only one class of outcomes is possible.
          </p>
          <p>
            The one thing psychohistory cannot handle is the{" "}
            <em className="text-navy-300">Mule</em>: an anomaly so far outside
            the statistical distribution that the equations break down entirely.
            The existence of the Second Foundation is the defence against exactly
            this failure mode.
          </p>
        </div>
      </div>

      {/* ── The Parallel ── */}
      <div className="max-w-4xl mx-auto px-6 mb-20">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
          The Mapping
        </span>
        <h2 className="font-sans text-2xl font-semibold text-navy-100 mt-2 mb-2">
          Fiction Into Framework
        </h2>
        <p className="font-sans text-sm text-navy-500 mb-10 max-w-xl">
          Every concept in Foundation maps to a real analytical discipline.
          Asimov studied chemistry at Columbia and modelled psychohistory on
          statistical mechanics. The fiction was always closer to science than
          most readers realised.
        </p>

        <div className="space-y-px">
          {parallels.map((p, i) => (
            <div
              key={p.fiction}
              className="grid md:grid-cols-[40px_1fr_1fr] border-b border-navy-700/25 last:border-b-0"
            >
              {/* Index */}
              <div className="hidden md:flex items-start pt-5 justify-center">
                <span className="font-mono text-[10px] text-navy-600">
                  {sourceLabels[i]}
                </span>
              </div>
              {/* Fiction side */}
              <div className="p-5 md:pr-8 md:border-r border-navy-700/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-navy-600">
                    Fiction
                  </span>
                  <span className="font-mono text-[9px] text-navy-700">
                    {p.source}
                  </span>
                </div>
                <h3 className="font-sans text-base font-semibold text-navy-200 mb-2">
                  {p.fiction}
                </h3>
                <p className="font-sans text-[13px] text-navy-500 leading-relaxed">
                  {p.fictionDesc}
                </p>
              </div>
              {/* Reality side */}
              <div className="p-5 md:pl-8">
                <div className="mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-navy-500">
                    Application
                  </span>
                </div>
                <h3 className="font-sans text-base font-semibold text-navy-200 mb-2">
                  {p.reality}
                </h3>
                <p className="font-sans text-[13px] text-navy-400 leading-relaxed">
                  {p.realityDesc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── The Science ── */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
          The Mathematics
        </span>
        <h2 className="font-sans text-2xl font-semibold text-navy-100 mt-2 mb-6">
          Why This Is Not Fiction
        </h2>

        <div className="space-y-5 font-sans text-[15px] text-navy-400 leading-relaxed">
          <p>
            Asimov was not inventing from nothing. Psychohistory was modelled on{" "}
            <em className="text-navy-300">statistical mechanics</em>, the branch
            of physics that Ludwig Boltzmann formalised in the 1870s. Boltzmann
            showed that while individual gas molecules move unpredictably, a
            sufficiently large collection of them behaves in ways that can be
            described by precise mathematical laws. Temperature, pressure,
            entropy: properties of aggregates, not individuals.
          </p>
          <p>
            The mathematics that makes this work is{" "}
            <em className="text-navy-300">Bayesian probability</em>, first
            described by Thomas Bayes in 1763 and formalised by Pierre-Simon
            Laplace. Bayesian inference provides a framework for updating beliefs
            as new evidence arrives. Start with a prior estimate. Observe
            evidence. Compute how much more likely that evidence is under your
            hypothesis than under the alternative. Update. Repeat. The posterior
            probability converges on the truth as evidence accumulates.
          </p>
          <p>
            Complex systems theory, developed through the twentieth century by
            researchers including Ilya Prigogine, Per Bak, and Stuart Kauffman,
            added the critical insight that large systems exhibit{" "}
            <em className="text-navy-300">phase transitions</em>: qualitative
            shifts in behaviour that occur when quantitative parameters cross
            thresholds. Water does not gradually become ice. It is liquid until
            it isn&apos;t. Markets do not gradually enter crisis. Geopolitical
            systems do not gradually transition from peace to war. They are one
            thing until the structural forces tip, and then they are another.
          </p>
        </div>

        {/* Reference bar */}
        <div className="mt-10 border-t border-navy-700/30 pt-6">
          <span className="font-mono text-[9px] uppercase tracking-widest text-navy-600 block mb-4">
            Intellectual Lineage
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: "Boltzmann",
                year: "1877",
                field: "Statistical Mechanics",
              },
              {
                name: "Bayes / Laplace",
                year: "1763 / 1812",
                field: "Bayesian Probability",
              },
              {
                name: "Asimov",
                year: "1951",
                field: "Psychohistory (Fiction)",
              },
              {
                name: "Prigogine / Bak",
                year: "1977 / 1987",
                field: "Complex Systems",
              },
            ].map((r) => (
              <div key={r.name}>
                <div className="font-sans text-xs text-navy-300 font-medium">
                  {r.name}
                </div>
                <div className="font-mono text-[10px] text-navy-500">
                  {r.year}
                </div>
                <div className="font-mono text-[9px] text-navy-600 mt-0.5">
                  {r.field}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── The Constraint ── */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
          The Limitation
        </span>
        <h2 className="font-sans text-2xl font-semibold text-navy-100 mt-2 mb-6">
          What Psychohistory Cannot Do
        </h2>

        <div className="space-y-5 font-sans text-[15px] text-navy-400 leading-relaxed">
          <p>
            Seldon imposed two constraints on psychohistory that Asimov, with the
            instinct of a trained scientist, understood were non-negotiable.
            First: the population being modelled must be large enough for
            statistical regularity. Psychohistory cannot predict individual
            behaviour. It can only predict aggregate behaviour across populations
            large enough that individual deviations cancel out.
          </p>
          <p>
            Second, and more subtle: the population must not be aware of the
            predictions. If the subjects know what the model expects, their
            behaviour changes, and the predictions become self-fulfilling or
            self-defeating. This is not a fictional conceit. It is the{" "}
            <em className="text-navy-300">observer effect</em> applied to social
            systems, and it is why the Second Foundation had to remain hidden.
          </p>
          <p>
            Any honest analytical system must respect both constraints. Model
            state-level actor-groups, military institutions, and
            demographic-scale movements, never individuals. And never publish
            probability estimates to the populations being modelled, because the
            act of publication changes the system being measured.
          </p>
        </div>

        <div className="mt-8 border-l-2 border-accent-amber/30 pl-5 py-1">
          <p className="font-sans text-[13px] text-navy-500 italic leading-relaxed">
            This is why the methodology pages describe principles, not
            parameters. The signal theory page explains what convergence means,
            not the coefficients. The research is public. The calibration is not.
          </p>
        </div>
      </div>

      {/* ── Why This Matters to Us ── */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-navy-500">
          The Builder
        </span>
        <h2 className="font-sans text-2xl font-semibold text-navy-100 mt-2 mb-6">
          Why Foundation
        </h2>

        <div className="space-y-5 font-sans text-[15px] text-navy-400 leading-relaxed">
          <p>
            I read Foundation for the first time when I was fourteen. The idea
            that you could look at the world not as a collection of
            unpredictable people making unpredictable decisions, but as a system
            of forces that, at sufficient scale, followed mathematical laws,
            changed how I thought about everything. It did not make the world
            less interesting. It made it more honest.
          </p>
          <p>
            NEXUS exists because I kept coming back to that idea for twenty
            years. As a software engineer, I watched machine learning mature to
            the point where Bayesian inference over multi-layered evidence was
            not just theoretically possible but practically buildable. As someone
            who follows geopolitics obsessively, I watched the same patterns
            repeat: the same actors, the same calendar triggers, the same
            structural pressures producing the same class of outcomes, decade
            after decade. And I kept thinking about Seldon.
          </p>
          <p>
            The platform is named after a convergence point. The intellectual
            framework is named after a book about a mathematician who saw the
            fall coming and built something at the edge of the galaxy to watch it
            happen and shorten the darkness on the other side. I cannot claim
            NEXUS will shorten anything. But I can claim, with the honesty that
            Asimov would have demanded, that the structural forces are real, the
            mathematics works on populations at scale, and the patterns are there
            for anyone willing to look at them without flinching.
          </p>
        </div>

        <div className="mt-6 font-mono text-[11px] text-navy-600">
          Andre Figueira, Founder
        </div>
      </div>

      {/* ── Closing ── */}
      <div className="max-w-3xl mx-auto px-6">
        <div className="border-t border-navy-700/30 pt-10">
          <blockquote className="font-sans text-lg md:text-xl text-navy-300 italic leading-relaxed mb-6">
            &ldquo;The equations do not tell you what will happen. They tell you
            where the weight is pressing. They tell you which walls are
            load-bearing and which are decorative. And when enough load-bearing
            walls are under enough pressure from enough directions, the equations
            tell you that the specific decisions of the people inside the
            building no longer determine whether it stands.&rdquo;
          </blockquote>
          <p className="font-sans text-sm text-navy-500 leading-relaxed max-w-lg">
            NEXUS does not predict what individuals will do. It surfaces where
            the structural forces are concentrating, how fast they are building,
            and what happens when they converge. The rest is up to the analyst.
          </p>
          <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-navy-600">
            The names change. The math doesn&apos;t.
          </div>
        </div>
      </div>
    </main>
  );
}
