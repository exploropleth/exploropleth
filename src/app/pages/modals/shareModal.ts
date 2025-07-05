// ShareModalComponent: Modal for sharing/exporting map visualizations and binning method details.
import { Component, ChangeDetectorRef } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import html2canvas from 'html2canvas';
import * as changedpi from 'changedpi';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';

@Component({
  selector: 'share-modal-component',
  template: `
      <div class="p-fluid">
        <table class="table table-sm table-borderless" style="table-layout: fixed;">
          <tbody>
            <tr>
              <td style="width: 20%;">Vector</td>
              <td>
                <button type="button"
                  (click)="exportAsSVG('#choroplethcard-' + dct_id)"
                  class="btn btn-sm btn-outline-secondary mb-sm">
                  <i class="fas fa-download"></i>&nbsp;SVG
                </button>
              </td>
            </tr>
            <tr>
              <td style="width: 20%;">Raster</td>
              <td>
                <form style="width: 300px !important;">
                  <div class="form-row">
                    <div class="col">
                      <label for="inputDPI">DPI</label>
                      <input type="number" [(ngModel)]="dpi" class="form-control" placeholder="DPI" [ngModelOptions]="{standalone: true}">
                    </div>
                    <div class="col">
                      <label for="inputScale">Scale</label>
                      <input type="number" [(ngModel)]="scale" class="form-control" placeholder="Scale" [ngModelOptions]="{standalone: true}">
                    </div>
                    <div class="col">
                      <label for="inputExport">&nbsp;</label>
                      <div>
                        <button type="button"
                          (click)="exportAsPNG('#choroplethcard-' + dct_id, dpi, scale)"
                          class="btn btn-sm btn-outline-secondary mb-sm">
                          <i class="fas fa-download"></i>&nbsp;PNG
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </td>
            </tr>
            <tr>
              <td style="width: 20%;">Bin&nbsp;Breaks</td>
              <td>
                <div class="input-group">
                  <input type="text" class="form-control"
                    [value]="'[' + binningMethodObj.binBreaks + ']'"/>
                  <div class="input-group-append">
                    <button class="btn btn-outline-secondary" type="button"
                      (click)="copyContent(binningMethodObj.binBreaks)">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 20%;">Bin&nbsp;Sizes</td>
              <td>
                <div class="input-group">
                  <input type="text" class="form-control"
                    [value]="'[' + objectValues(binningMethodObj.binSizes) + ']'"/>
                  <div class="input-group-append">
                    <button class="btn btn-outline-secondary" type="button"
                      (click)="copyContent(objectValues(binningMethodObj.binSizes))">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 20%;">Implementation (using BinGuru)</td>
              <td>
                <div class="w-100 position-relative">
                  <a [href]="binningMethodObj.implementationLink" target="_blank">
                    View on Observable&nbsp;&nbsp;<i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 20%;">Source Code (in BinGuru)</td>
              <td>
                <div class="w-100 position-relative">
                  <a [href]="binningMethodObj.tsCode" target="_blank">
                    View on GitHub&nbsp;&nbsp;<i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="width: 20%;">Specification (Vega-Lite)</td>
              <td>
                <div class="w-100 position-relative">
                  <ngx-codemirror
                    [(ngModel)]="binningMethodObj.vlSpec"
                    [ngModelOptions]="{standalone: true}"
                    [options]="{
                      lineNumbers: true,
                      theme: 'default',
                      mode: { name: 'javascript', json: true },
                      readOnly: true,
                      showCursorWhenSelecting: true
                    }">
                  </ngx-codemirror>
                  <button style="position: absolute; right: 0; top: 0;"
                    class="btn btn-outline-secondary" type="button"
                    (click)="copyContent(binningMethodObj.vlSpec)">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
  `,
  styles: [],
  imports: [CommonModule, FormsModule, CodemirrorModule],
  standalone: true
})
export class ShareModalComponent {
  // Object holding binning method details
  binningMethodObj: any;
  // Unique id for the choropleth card (used for export selectors)
  dct_id: string;
  // Utility for extracting object values (for display)
  objectValues = Object.values;
  // Export options
  dpi: number = 300;
  scale: number = 1;
  isExporting: boolean = false;

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
    private cd: ChangeDetectorRef
  ) {
    // Load binning method and id from dialog config
    this.binningMethodObj = config.data.binningMethodObj;
    this.dct_id = config.data.dct_id;
  }

  /**
   * Show the global loading spinner overlay.
   */
  showGlobalLoadingSpinner() {
    const spinner = document.getElementById('global-loading-spinner');
    if (spinner) spinner.classList.add('show');
  }
  /**
   * Hide the global loading spinner overlay.
   */
  hideGlobalLoadingSpinner() {
    const spinner = document.getElementById('global-loading-spinner');
    if (spinner) spinner.classList.remove('show');
  }

  /**
   * Export the selected element as a PNG image with custom DPI and scale.
   */
  exportAsPNG(elementSelector: string, dpi: number, scale: number) {
    this.showGlobalLoadingSpinner();
    this.isExporting = true;
    this.cd.detectChanges(); // Force spinner to show immediately
    const scaleNum = parseFloat(scale.toString()) || 1;
    const dpiNum = parseInt(dpi.toString(), 10) || 300;
    const element = document.querySelector(elementSelector) as HTMLElement;
    if (!element) {
      this.isExporting = false;
      this.hideGlobalLoadingSpinner();
      this.cd.detectChanges();
      return;
    }
    setTimeout(() => {
      html2canvas(element, { scale: scaleNum, useCORS: true, backgroundColor: null }).then(canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        const customResDataUrl = changedpi.changeDpiDataUrl(dataUrl, dpiNum);
        const link = document.createElement('a');
        link.href = customResDataUrl;
        link.download = 'export.png';
        link.click();
      }).finally(() => {
        this.isExporting = false;
        this.hideGlobalLoadingSpinner();
        this.cd.detectChanges();
      });
    }, 10);
  }

  /**
   * Export the SVG inside the selected element as a .svg file.
   */
  exportAsSVG(elementSelector: string) {
    this.showGlobalLoadingSpinner();
    this.isExporting = true;
    this.cd.detectChanges(); // Force spinner to show immediately
    const container = document.querySelector(elementSelector);
    if (!container) {
      this.isExporting = false;
      this.hideGlobalLoadingSpinner();
      this.cd.detectChanges();
      return;
    }
    const svg = container.querySelector('svg');
    if (!svg) {
      alert('No SVG found in the selected element.');
      this.isExporting = false;
      this.hideGlobalLoadingSpinner();
      this.cd.detectChanges();
      return;
    }
    setTimeout(() => {
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svg);
      // Add XML declaration and SVG namespace if missing
      if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!source.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'export.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.isExporting = false;
      this.hideGlobalLoadingSpinner();
      this.cd.detectChanges();
    }, 10);
  }

  /**
   * Copy the provided content to the clipboard.
   */
  copyContent(content: any) {
    navigator.clipboard.writeText(content);
  }
} 