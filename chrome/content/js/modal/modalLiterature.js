// Literature association and academic types submodule for Modal dialog

const ModalLiterature = {
  isZotero() {
    return Boolean(
      (typeof ZoteroBridge !== 'undefined' && ZoteroBridge.isZotero) ||
      (typeof window !== 'undefined' && (window.Zotero || window.parent?.Zotero))
    );
  },

  setAcademicType(type) {
    this._academicType = type;
    const input = document.getElementById('task-academic-type');
    if (input) input.value = type;

    document.querySelectorAll('#academic-type-segmented .academic-seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    if (this.currentZoteroLiterature) {
      this.currentZoteroLiterature.academicType = type;
    }

    const categoryInput = document.getElementById('task-category');
    if (categoryInput && (!categoryInput.value || ['论文研读', '论文写作', '实验设计', '会议投稿', '审稿评阅', '通用待办', '日常'].includes(categoryInput.value))) {
      const typeCategoryMap = {
        literature_reading: '论文研读',
        writing: '论文写作',
        experiment: '实验设计',
        submission: '会议投稿',
        peer_review: '审稿评阅',
        general: '日常'
      };
      categoryInput.value = typeCategoryMap[type] || '论文研读';
    }

    if (type === 'submission') {
      const highRadio = this.form.querySelector('input[name="priority"][value="high"]');
      if (highRadio) highRadio.checked = true;
    }
  },

  getAcademicType() {
    return document.getElementById('task-academic-type')?.value || this._academicType || 'general';
  },

  // Render Zotero Literature association section
  renderLiteratureSection() {
    const section = document.getElementById('modal-literature-section');
    if (!section) return;

    if (this.currentZoteroLiterature) {
      const lit = this.currentZoteroLiterature;
      section.innerHTML = `
        <div class="modal-lit-card zotero-native-card">
          <div class="modal-lit-header">
            <button type="button" id="btn-modal-literature-link" class="modal-lit-title-row modal-lit-link" title="在 Zotero 中跳转到对应文献条目" aria-label="跳转到 Zotero 文献：${Utils.escapeHtml(lit.title)}">
              <span class="modal-lit-badge">📄 ZOTERO 文献</span>
              <span class="modal-lit-title" title="${Utils.escapeHtml(lit.title)}">${Utils.escapeHtml(lit.title)}</span>
            </button>
            <button type="button" id="btn-modal-unlink-lit" class="btn-lit-unlink" title="解除文献关联">×</button>
          </div>
          <div class="modal-lit-meta">
            <span class="modal-lit-author">✍️ ${Utils.escapeHtml(lit.authors || '未知作者')}</span>
            ${lit.year ? `<span class="modal-lit-year">📅 ${Utils.escapeHtml(lit.year)}</span>` : ''}
            ${lit.publication ? `<span class="modal-lit-pub">🏛️ ${Utils.escapeHtml(lit.publication)}</span>` : ''}
          </div>

          <!-- PDF Page anchor & deep-link actions -->
          <div class="modal-lit-row">
            <div class="modal-lit-page-field">
              <label for="modal-lit-page">📖 PDF 对应页码:</label>
              <input type="number" id="modal-lit-page" min="1" placeholder="页码 (如 12)" value="${Utils.escapeHtml(lit.page || '')}" class="styled-page-input">
            </div>
            <div class="modal-lit-actions">
              ${lit.pdfUri ? `<button type="button" id="btn-modal-open-pdf" class="btn-lit-action pdf">📖 打开 PDF 伴读</button>` : ''}
              <button type="button" id="btn-modal-locate-item" class="btn-lit-action locate">↗ 跳转文献条目</button>
            </div>
          </div>

          <!-- Optional Excerpt / Quote -->
          <div class="modal-lit-quote-field">
            <textarea id="modal-lit-quote" rows="2" placeholder="文献重点引文或精读摘录（可选，将随任务同步至云端笔记）" class="styled-lit-quote">${Utils.escapeHtml(lit.quote || '')}</textarea>
          </div>
        </div>
      `;

      // Listen for page number changes
      section.querySelector('#modal-lit-page')?.addEventListener('input', (e) => {
        const p = parseInt(e.target.value);
        lit.page = Number.isInteger(p) && p > 0 ? p : null;
        if (lit.page && lit.pdfUri) {
          lit.pdfUri = lit.pdfUri.replace(/([?&]page=)\d+/, `$1${lit.page}`);
          if (!lit.pdfUri.includes('page=')) {
            lit.pdfUri += (lit.pdfUri.includes('?') ? '&' : '?') + `page=${lit.page}`;
          }
        }
      });

      // Listen for quote changes
      section.querySelector('#modal-lit-quote')?.addEventListener('input', (e) => {
        lit.quote = e.target.value.trim();
      });

      section.querySelector('#btn-modal-open-pdf')?.addEventListener('click', () => {
        if (typeof ZoteroBridge !== 'undefined') {
          ZoteroBridge.openPdf(lit.pdfUri || lit.zoteroUri || lit.key, lit.libraryID, lit.page, lit.annotationKey);
        }
      });

      const locateLiterature = () => {
        if (typeof ZoteroBridge !== 'undefined') {
          ZoteroBridge.locateItem(lit.zoteroUri || lit.key, lit.libraryID);
        }
      };
      section.querySelector('#btn-modal-literature-link')?.addEventListener('click', locateLiterature);
      section.querySelector('#btn-modal-locate-item')?.addEventListener('click', locateLiterature);

      section.querySelector('#btn-modal-unlink-lit')?.addEventListener('click', () => {
        this.currentZoteroLiterature = null;
        this.renderLiteratureSection();
      });
      section.style.display = 'block';
    } else if (this.isZotero()) {
      section.innerHTML = `
        <div class="modal-lit-attach-bar">
          <button type="button" id="btn-modal-attach-lit" class="btn-attach-literature">
            <span>🔗 关联当前选中的 Zotero 文献条目</span>
          </button>
        </div>
      `;
      section.querySelector('#btn-modal-attach-lit')?.addEventListener('click', async () => {
        const item = await ZoteroBridge.getActiveItem();
        if (item) {
          this.currentZoteroLiterature = {
            key: item.key,
            title: item.title,
            authors: item.authors,
            year: item.year,
            libraryID: item.libraryID,
            publication: item.publication,
            zoteroUri: item.zoteroUri,
            pdfUri: item.pdfUri,
            page: item.page || null,
            quote: item.quote || '',
            academicType: this.getAcademicType() || 'literature_reading'
          };
          this.renderLiteratureSection();
          UI.showToast(`已关联文献：《${item.title.slice(0, 18)}...》`);
        } else {
          UI.showToast('未在 Zotero 中检测到选中文献');
        }
      });
      section.style.display = 'block';
    } else {
      section.innerHTML = '';
      section.style.display = 'none';
    }
  },

  setReadingProfile(profileID = null) {
    const select = document.getElementById('task-reading-profile');
    if (!select) return;
    select.replaceChildren();
    for (const [id, profile] of Object.entries(LiteratureWorkflow.profiles)) {
      const option = document.createElement('option'); option.value = id; option.textContent = profile.label;
      select.appendChild(option);
    }
    const preferred = profileID || Storage._zoteroCache?.settings?.readingProfile || 'general';
    select.value = Object.hasOwn(LiteratureWorkflow.profiles, preferred) ? preferred : 'general';
  }
};

if (typeof window !== 'undefined') {
  window.ModalLiterature = ModalLiterature;
}

