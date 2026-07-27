export type PacingRevisionPageTarget =
  | {
      kind: 'physical';
      pageId: string;
      pageNumber: number;
      targetKey: string;
    }
  | {
      kind: 'virtual';
      pageId: null;
      pageNumber: number;
      targetKey: string;
    };

export type PacingRevisionPhysicalPage = {
  id: string;
  issue_id: string;
  page_number: number;
  beats_json: unknown;
  script_text: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function proposedOutlinePageNumbers(outline: unknown): Set<number> {
  const pageBeats = asObject(outline).page_beats;
  if (!Array.isArray(pageBeats)) return new Set();
  return new Set(pageBeats.flatMap((beat) => {
    const pageNumber = asObject(beat).page_target;
    return Number.isInteger(pageNumber) && Number(pageNumber) >= 1 && Number(pageNumber) <= 200
      ? [Number(pageNumber)]
      : [];
  }));
}

export function buildPacingRevisionPromptPage(
  target: PacingRevisionPageTarget,
  physicalPages: PacingRevisionPhysicalPage[],
  virtualPromptPageId: string,
): PacingRevisionPhysicalPage | (Omit<PacingRevisionPhysicalPage, 'issue_id'> & { issue_id: null }) {
  if (target.kind === 'physical') {
    const page = physicalPages.find((candidate) => candidate.id === target.pageId);
    if (!page) throw new Error('Resolved physical page is unavailable');
    return page;
  }
  return {
    id: virtualPromptPageId,
    issue_id: null,
    page_number: target.pageNumber,
    beats_json: null,
    script_text: null,
  };
}

export function resolvePacingRevisionPageTarget(input: {
  requestedPageId: string | null;
  requestedPageNumber: number;
  physicalPages: Array<{ id: string; page_number: number }>;
  proposedPageNumbers: Set<number>;
}): PacingRevisionPageTarget {
  const {
    requestedPageId,
    requestedPageNumber,
    physicalPages,
    proposedPageNumbers,
  } = input;

  if (!Number.isInteger(requestedPageNumber) || requestedPageNumber < 1 || requestedPageNumber > 200) {
    throw new Error('Requested page number must be between 1 and 200');
  }

  if (requestedPageId !== null) {
    const physicalPage = physicalPages.find((page) => page.id === requestedPageId);
    if (!physicalPage) {
      throw new Error('Requested physical page does not belong to this issue');
    }
    if (physicalPage.page_number !== requestedPageNumber) {
      throw new Error('Requested physical page ID does not match page number');
    }
    return {
      kind: 'physical',
      pageId: physicalPage.id,
      pageNumber: physicalPage.page_number,
      targetKey: `page:${physicalPage.id}`,
    };
  }

  if (physicalPages.some((page) => page.page_number === requestedPageNumber)) {
    throw new Error('Requested virtual page is already occupied');
  }
  const currentPhysicalMax = physicalPages.reduce(
    (maximum, page) => Math.max(maximum, page.page_number),
    0,
  );
  if (requestedPageNumber <= currentPhysicalMax) {
    throw new Error('Requested virtual page must be beyond the physical maximum');
  }
  if (!proposedPageNumbers.has(requestedPageNumber)) {
    throw new Error('Requested virtual page is not present in the proposed outline');
  }
  for (let pageNumber = currentPhysicalMax + 1; pageNumber <= requestedPageNumber; pageNumber += 1) {
    if (!proposedPageNumbers.has(pageNumber)) {
      throw new Error('Requested virtual page requires contiguous proposed pages after the physical maximum');
    }
  }

  return {
    kind: 'virtual',
    pageId: null,
    pageNumber: requestedPageNumber,
    targetKey: `virtual-page:${requestedPageNumber}`,
  };
}
