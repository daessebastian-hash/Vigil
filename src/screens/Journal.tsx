import { useStore } from '../state/store';
import { ScreenHeader, SectionTitle } from '../components/ui';
import { JOURNAL_CATEGORIES, JOURNAL_QUESTIONS } from '../data/journal';
import { dayLabel } from '../data/format';
import { addDays } from '../data/dates';

export function Journal() {
  const { journal, setJournalAnswer, selectedKey, todayKey } = useStore();
  const entry = journal[selectedKey] ?? {};
  const answered = JOURNAL_QUESTIONS.filter((q) => q.id in entry).length;
  const about = dayLabel(addDays(selectedKey, -1), todayKey);

  return (
    <div className="screen">
      <ScreenHeader title="Journal" subtitle={dayLabel(selectedKey, todayKey)} />
      <div className="card journal-progress">
        <span>
          <b>
            {answered} of {JOURNAL_QUESTIONS.length} answered
          </b>
          <small>About {about === 'YESTERDAY' ? 'yesterday' : about.toLowerCase()}</small>
        </span>
        <span className="progress">
          <span style={{ width: `${(answered / JOURNAL_QUESTIONS.length) * 100}%` }} />
        </span>
      </div>
      {JOURNAL_CATEGORIES.map((c) => (
        <section className="section" key={c.id}>
          <SectionTitle>{c.label}</SectionTitle>
          <div className="card rows">
            {JOURNAL_QUESTIONS.filter((q) => q.category === c.id).map((q) => {
              const value = entry[q.id];
              return (
                <div className="row journal-row" key={q.id}>
                  <span className="row-label">{q.label}</span>
                  <span className="yn" role="group" aria-label={q.label}>
                    <button type="button" aria-pressed={value === true} onClick={() => setJournalAnswer(selectedKey, q.id, value === true ? null : true)}>
                      Yes
                    </button>
                    <button type="button" aria-pressed={value === false} onClick={() => setJournalAnswer(selectedKey, q.id, value === false ? null : false)}>
                      No
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
