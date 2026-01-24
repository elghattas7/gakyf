/**
 * Export Utilities
 * Provides multi-format export functionality (PDF, Excel, Word)
 */

const exportUtils = {
    /**
     * Prompt user to select export format
     * @returns {Promise<string|null>} Selected format ('pdf', 'excel', 'word') or null if cancelled
     */
    async promptExportFormat() {
        const result = await Swal.fire({
            title: i18n.t('select_export_format') || 'Sélectionner le format',
            text: i18n.t('export_format_description') || 'Choisissez le format de fichier',
            icon: 'question',
            showCancelButton: true,
            cancelButtonText: i18n.t('cancel') || 'Annuler',
            showDenyButton: true,
            showConfirmButton: true,
            confirmButtonText: `<i class="fas fa-file-pdf"></i> ${i18n.t('export_as_pdf') || 'PDF'}`,
            denyButtonText: `<i class="fas fa-file-excel"></i> ${i18n.t('export_as_excel') || 'Excel'}`,
            cancelButtonColor: '#6c757d',
            confirmButtonColor: '#dc3545',
            denyButtonColor: '#28a745',
            customClass: {
                actions: 'export-format-actions'
            },
            html: `
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    <button type="button" class="swal2-confirm swal2-styled" style="background-color: #dc3545; width: 100%;">
                        📄 ${i18n.t('export_as_pdf') || 'PDF'}
                    </button>
                    <button type="button" class="swal2-deny swal2-styled" style="background-color: #28a745; width: 100%;">
                        📊 ${i18n.t('export_as_excel') || 'Excel'}
                    </button>
                    <button type="button" class="swal2-cancel swal2-styled" style="background-color: #007bff; width: 100%;">
                        📝 ${i18n.t('export_as_word') || 'Word'}
                    </button>
                </div>
            `,
            showCloseButton: true,
            didOpen: () => {
                // Custom button handlers
                const popup = Swal.getPopup();
                const buttons = popup.querySelectorAll('button.swal2-styled');

                buttons[0].onclick = () => Swal.clickConfirm(); // PDF
                buttons[1].onclick = () => Swal.clickDeny(); // Excel
                buttons[2].onclick = () => Swal.clickCancel(); // Word (repurposed)
            }
        });

        if (result.isConfirmed) return 'pdf';
        if (result.isDenied) return 'excel';
        if (result.dismiss === Swal.DismissReason.cancel) return 'word';
        return null;
    },

    /**
     * Export data to Excel
     * @param {Array<Array>} data - 2D array of data (headers + rows)
     * @param {string} filename - Output filename (without extension)
     * @param {string} sheetName - Sheet name
     */
    exportToExcel(data, filename, sheetName = 'Sheet1') {
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(data);

            // Auto-size columns
            const colWidths = [];
            data.forEach(row => {
                row.forEach((cell, i) => {
                    const cellStr = String(cell || '');
                    const width = Math.max(cellStr.length, 10);
                    colWidths[i] = Math.max(colWidths[i] || 0, width);
                });
            });
            ws['!cols'] = colWidths.map(w => ({ wch: w }));

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
            XLSX.writeFile(wb, `${filename}.xlsx`);

            return true;
        } catch (e) {
            console.error('Excel export error:', e);
            utils.showNotification('Erreur lors de l\'export Excel', 'error');
            return false;
        }
    },

    /**
     * Export data to Word
     * @param {Array<Array>} data - 2D array of data (headers + rows)
     * @param {string} filename - Output filename (without extension)
     * @param {string} title - Document title
     */
    async exportToWord(data, filename, title = '') {
        try {
            const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType } = docx;

            const headerRow = data[0] || [];
            const bodyRows = data.slice(1);

            // Create table rows
            const tableRows = [
                // Header row
                new TableRow({
                    children: headerRow.map(cell =>
                        new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({ text: String(cell || ''), bold: true })],
                                alignment: AlignmentType.CENTER
                            })],
                            shading: { fill: '4472C4' }
                        })
                    ),
                    tableHeader: true
                }),
                // Data rows
                ...bodyRows.map(row =>
                    new TableRow({
                        children: row.map(cell =>
                            new TableCell({
                                children: [new Paragraph({
                                    children: [new TextRun({ text: String(cell || '') })]
                                })]
                            })
                        )
                    })
                )
            ];

            const table = new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE }
            });

            const doc = new Document({
                sections: [{
                    children: [
                        ...(title ? [new Paragraph({
                            children: [new TextRun({ text: title, bold: true, size: 32 })],
                            spacing: { after: 200 },
                            alignment: AlignmentType.CENTER
                        })] : []),
                        table
                    ]
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${filename}.docx`);

            return true;
        } catch (e) {
            console.error('Word export error:', e);
            utils.showNotification('Erreur lors de l\'export Word', 'error');
            return false;
        }
    },

    /**
     * Export HTML content to PDF
     * @param {HTMLElement|string} content - The HTML content or element to export
     * @param {string} filename - Output filename (without extension)
     * @param {Object} options - { orientation: 'portrait'|'landscape' }
     */
    async exportToPdf(content, filename, options = {}) {
        if (!window.html2pdf) {
            console.error('html2pdf library not loaded');
            utils.showNotification('Bibliothèque export PDF manquante', 'error');
            return false;
        }

        try {
            // Add logo if available
            let pdfContent = content;
            if (window.logoBase64) {
                // Ensure content is a string
                if (typeof content === 'string') {
                    pdfContent = `
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${window.logoBase64}" style="width: 100px; height: auto;">
                        </div>
                        ${content}
                    `;
                } else {
                    // If element, we prepend a div
                    const container = document.createElement('div');
                    container.innerHTML = `
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="${window.logoBase64}" style="width: 100px; height: auto;">
                        </div>
                    `;
                    container.appendChild(content.cloneNode(true));
                    pdfContent = container;
                }
            }

            const opt = {
                margin: 10,
                filename: `${filename}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: options.orientation || 'portrait' }
            };

            await html2pdf().set(opt).from(pdfContent).save();
            return true;
        } catch (e) {
            console.error('PDF Export error:', e);
            utils.showNotification('Erreur lors de la génération du PDF', 'error');
            return false;
        }
    },

    /**
     * Convert object array to 2D array for export
     * @param {Array<Object>} objects - Array of objects
     * @param {Array<string>} keys - Keys to extract (in order)
     * @param {Array<string>} headers - Header labels
     * @returns {Array<Array>} 2D array with headers
     */
    objectsToArray(objects, keys, headers) {
        const data = [headers];
        objects.forEach(obj => {
            const row = keys.map(key => obj[key] ?? '');
            data.push(row);
        });
        return data;
    }
};
