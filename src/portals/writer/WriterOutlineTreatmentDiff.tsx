const DIFF_CHARACTER_LIMIT = 2_000;

function comparableToken(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
}

export function WriterOutlineTreatmentDiff({
  original,
  proposed,
}: {
  original: string;
  proposed: string;
}) {
  if (original === proposed) {
    return <span>{proposed}</span>;
  }

  if (original.length + proposed.length > DIFF_CHARACTER_LIMIT) {
    return (
      <span aria-label="Proposed wording with changes highlighted">
        <mark className="rounded bg-amber-200/80 px-0.5 text-inherit">{proposed}</mark>
      </span>
    );
  }

  const originalWords = new Set(
    original.split(/\s+/).map(comparableToken).filter(Boolean),
  );
  const proposedTokens = proposed.split(/(\s+)/);

  return (
    <span aria-label="Proposed wording with changes highlighted">
      {proposedTokens.map((token, index) => {
        if (!token.trim() || originalWords.has(comparableToken(token))) {
          return <span key={`${index}-${token}`}>{token}</span>;
        }
        return (
          <mark
            key={`${index}-${token}`}
            className="rounded bg-amber-200/80 px-0.5 text-inherit"
          >
            {token}
          </mark>
        );
      })}
    </span>
  );
}
