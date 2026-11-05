/**
 * Zotero TaskFlow - Host Utilities & Literature Serializers
 */

declare let Zotero: any;

export const escapeHtml = (value: any): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const itemSelectUri = (item: any): string => {
  if (!item) return '';
  const key = item.key || item.id;
  const groupID = Zotero.Libraries?.get?.(item.libraryID)?.groupID;
  return groupID
    ? `zotero://select/groups/${groupID}/items/${key}`
    : `zotero://select/library/items/${key}`;
};

export const getLiteratureItem = (item: any): any => {
  if (!item) return null;
  let target =
    typeof item === 'number' || typeof item === 'string'
      ? Zotero.Items?.get?.(item) || null
      : item;
  if (!target) return null;
  try {
    if (
      target.topLevelItem &&
      typeof target.topLevelItem.isRegularItem === 'function' &&
      target.topLevelItem.isRegularItem()
    ) {
      return target.topLevelItem;
    }
  } catch (_) {}
  if (typeof target.isAttachment === 'function' && target.isAttachment()) {
    if (target.parentItemID) {
      target = Zotero.Items.get(target.parentItemID) || target;
    }
  }
  if (typeof target.isNote === 'function' && target.isNote()) {
    if (target.parentItemID) {
      target = Zotero.Items.get(target.parentItemID) || target;
    }
  }
  try {
    if (
      target.topLevelItem &&
      typeof target.topLevelItem.isRegularItem === 'function' &&
      target.topLevelItem.isRegularItem()
    ) {
      return target.topLevelItem;
    }
  } catch (_) {}
  return target &&
    typeof target.isRegularItem === 'function' &&
    target.isRegularItem()
    ? target
    : null;
};

export const serializeLiteratureItem = (item: any): any => {
  const target = getLiteratureItem(item);
  if (!target) return null;

  const title =
    (typeof target.getField === 'function'
      ? target.getField('title')
      : target.title) || '无标题文献';
  const date =
    typeof target.getField === 'function' ? target.getField('date') : target.date;
  let year = '';
  if (date) {
    const match = String(date).match(/\b(19|20)\d{2}\b/);
    year = match ? match[0] : String(date).slice(0, 4);
  }

  let authors: string[] = [];
  try {
    if (typeof target.getCreators === 'function') {
      authors = target
        .getCreators()
        .map(
          (c: any) =>
            c.lastName ||
            c.name ||
            `${c.firstName || ''} ${c.lastName || ''}`.trim()
        )
        .filter(Boolean);
    }
  } catch (_) {}

  const publication =
    typeof target.getField === 'function'
      ? target.getField('publicationTitle') ||
        target.getField('proceedingsTitle') ||
        target.getField('publisher') ||
        ''
      : '';

  let tags: string[] = [];
  try {
    if (typeof target.getTags === 'function') {
      tags = target
        .getTags()
        .map((t: any) => t.tag || String(t))
        .filter(Boolean);
    }
  } catch (_) {}

  // Find main PDF attachment
  let pdfUri = null;
  try {
    if (typeof target.getAttachments === 'function') {
      const attIds = target.getAttachments();
      for (const attId of attIds) {
        const att = Zotero.Items.get(attId);
        if (
          att &&
          ((typeof att.isPDFAttachment === 'function' &&
            att.isPDFAttachment()) ||
            att.contentType === 'application/pdf')
        ) {
          const groupID = Zotero.Libraries?.get?.(att.libraryID)?.groupID;
          pdfUri = groupID
            ? `zotero://open-pdf/groups/${groupID}/items/${att.key}`
            : `zotero://open-pdf/library/items/${att.key}`;
          break;
        }
      }
    }
  } catch (_) {}

  return {
    key: target.key || String(target.id),
    id: target.id,
    libraryID: target.libraryID,
    title,
    authors:
      authors.slice(0, 3).join(', ') + (authors.length > 3 ? ' 等' : ''),
    year,
    publication,
    tags,
    zoteroUri: itemSelectUri(target),
    pdfUri,
  };
};

export const resolveItemReference = (reference: any, libraryID?: any): any => {
  if (!reference) return null;
  const raw = String(reference).trim();
  const groupMatch = raw.match(
    /^zotero:\/\/(?:select|open-pdf)\/groups\/(\d+)\/items\/([A-Za-z0-9_]+)/
  );
  const key =
    groupMatch?.[2] ||
    raw.match(/\/items\/([A-Za-z0-9_]+)(?:[?#]|$)/)?.[1] ||
    raw;
  if (!/^[A-Za-z0-9_]+$/.test(key)) return null;
  if (!raw.includes('/items/') && /^\d+$/.test(key))
    return Zotero.Items.get(Number(key));

  let targetLibraryID =
    Number.isInteger(Number(libraryID)) && Number(libraryID) > 0
      ? Number(libraryID)
      : Zotero.Libraries?.userLibraryID || 1;
  if (groupMatch) {
    targetLibraryID =
      Zotero.Groups?.getLibraryIDFromGroupID?.(Number(groupMatch[1])) ||
      targetLibraryID;
  }
  return Zotero.Items.getByLibraryAndKey?.(targetLibraryID, key) || null;
};
