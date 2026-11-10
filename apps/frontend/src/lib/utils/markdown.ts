/**
 * Safely parse and render markdown into structured, accessible HTML for AI chat bubbles.
 */
export function formatAiMessage(text: string): string {
	if (!text) return '';

	// Clean carriage returns
	const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

	// If bullets or steps got collapsed onto single lines, restore newlines
	const normalized = raw
		.replace(/(?<=[.!?])\s+(?=[-*•]\s+\*\*)/g, '\n\n- ')
		.replace(/(?<=[.!?])\s+(?=\d+\.\s+)/g, '\n')
		.replace(/(?<=[.!?])\s+(?=\*\*Action Steps:?\*\*|###\s+Action Steps)/gi, '\n\n### Action Steps\n');

	// Split by double newlines into blocks (paragraphs, lists, headers)
	const blocks = normalized.split(/\n{2,}/);
	const htmlBlocks: string[] = [];

	for (const block of blocks) {
		const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
		if (lines.length === 0) continue;

		// 1. Heading check
		if (lines[0].startsWith('### ') || lines[0].startsWith('## ') || lines[0].startsWith('# ')) {
			const headingText = lines[0].replace(/^#{1,4}\s+/, '');
			htmlBlocks.push(
				`<h4 class="font-semibold text-foreground text-xs mt-2.5 mb-1 tracking-tight flex items-center gap-1.5">${formatInline(headingText)}</h4>`
			);
			if (lines.length > 1) {
				htmlBlocks.push(formatLinesAsBlock(lines.slice(1)));
			}
			continue;
		}

		// 2. Action steps title check
		if (/^\*\*Action Steps:?\*\*$/i.test(lines[0])) {
			htmlBlocks.push(
				`<div class="font-semibold text-foreground text-[11px] uppercase tracking-wider text-primary mt-2.5 mb-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>Action Steps</div>`
			);
			if (lines.length > 1) {
				htmlBlocks.push(formatLinesAsBlock(lines.slice(1)));
			}
			continue;
		}

		htmlBlocks.push(formatLinesAsBlock(lines));
	}

	return htmlBlocks.join('');
}

function formatLinesAsBlock(lines: string[]): string {
	const isBulletList = lines.every((l) => /^[-*•]\s+/.test(l));
	const isNumberedList = lines.every((l) => /^\d+\.\s+/.test(l));

	if (isBulletList) {
		const items = lines
			.map((l) => l.replace(/^[-*•]\s+/, ''))
			.map(
				(item) =>
					`<li class="flex items-start gap-2 my-1 pl-0.5"><span class="text-primary font-bold shrink-0 leading-tight select-none">•</span><span class="leading-relaxed">${formatInline(item)}</span></li>`
			)
			.join('');
		return `<ul class="my-1.5 space-y-1">${items}</ul>`;
	}

	if (isNumberedList) {
		const items = lines
			.map((l) => {
				const m = l.match(/^(\d+)\.\s+(.*)$/);
				const num = m ? m[1] : '1';
				const content = m ? m[2] : l;
				return `<li class="flex items-start gap-2 my-1 pl-0.5"><span class="text-primary font-semibold shrink-0 text-[10px] bg-primary/10 border border-primary/20 rounded px-1 py-0.2 select-none">${num}</span><span class="leading-relaxed">${formatInline(content)}</span></li>`;
			})
			.join('');
		return `<ol class="my-1.5 space-y-1.5">${items}</ol>`;
	}

	// Mixed or paragraph lines
	const formattedLines = lines.map((line) => {
		if (/^[-*•]\s+/.test(line)) {
			const item = line.replace(/^[-*•]\s+/, '');
			return `<div class="flex items-start gap-2 my-1 pl-0.5"><span class="text-primary font-bold shrink-0 leading-tight select-none">•</span><span class="leading-relaxed">${formatInline(item)}</span></div>`;
		}
		if (/^\d+\.\s+/.test(line)) {
			const m = line.match(/^(\d+)\.\s+(.*)$/);
			const num = m ? m[1] : '1';
			const content = m ? m[2] : line;
			return `<div class="flex items-start gap-2 my-1 pl-0.5"><span class="text-primary font-semibold shrink-0 text-[10px] bg-primary/10 border border-primary/20 rounded px-1 py-0.2 select-none">${num}</span><span class="leading-relaxed">${formatInline(content)}</span></div>`;
		}
		return `<p class="leading-relaxed mb-1.5 last:mb-0">${formatInline(line)}</p>`;
	});

	return formattedLines.join('');
}

function formatInline(text: string): string {
	// Escape raw html characters first
	let s = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	// Bold: **text**
	s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

	// Italic: *text* or _text_
	s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic text-foreground/90">$1</em>');

	// Inline code: `code`
	s = s.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-secondary border border-border/60 rounded text-[11px] font-mono">$1</code>');

	return s;
}
