// DetailsModalComponent: Modal to display details about a binning method.
import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import * as binningMethods from "../configurations/binningMethods";
import { CommonModule } from '@angular/common';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/markdown/markdown';

@Component({
  selector: 'modal-component',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-fluid">
      <!-- Map container (can be used for visualizations if needed) -->
      <div class="text-center w-100" #detailViewMapContainer [attr.id]="'detailViewMapContainer'"></div>
      <div class="mt-md">
        <table class="p-datatable p-datatable-xs">
          <tbody>
            <tr>
              <td class="text-muted text-right mw-lg" style="width: 20%;">Category</td>
              <td>
                <span class="p-badge" [ngClass]="getBinningMethodCategoryStyleClass(binningMethodObj.category)">{{binningMethodObj.category}}</span>
              </td>
            </tr>
            <tr>
              <td class="text-muted text-right mw-lg">Short Description</td>
              <td>{{binningMethodObj.description}}</td>
            </tr>
            <tr>
              <td class="text-muted text-right mw-lg">Long Description</td>
              <td>{{binningMethodObj.longDescription}}</td>
            </tr>
            <tr>
              <td class="text-muted text-right mw-lg">Bin Breaks</td>
              <td>[{{binningMethodObj.binBreaks}}]</td>
            </tr>
            <tr>
              <td class="text-muted text-right mw-lg">Bin Sizes</td>
              <td>[{{objectValues(binningMethodObj['binSizes'])}}]</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class DetailsModalComponent implements OnInit {
  // Reference to the map container div
  @ViewChild('detailViewMapContainer') detailViewMapContainer: ElementRef;
  // Object holding binning method details
  binningMethodObj: any;
  // Utility for extracting object values (for display)
  objectValues: any;

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {
    // Initialize with empty/default values
    this.binningMethodObj = {
      name: null,
      description: null,
      longDescription: null,
      category: null,
      binBreaks: null,
      binSizes: {}
    };
    this.objectValues = Object.values;
  }

  /**
   * OnInit lifecycle: load binning method data from dialog config if available.
   */
  ngOnInit() {
    if (this.config.data) {
      this.binningMethodObj = this.config.data.binningMethodObj || this.binningMethodObj;
    }
  }

  /**
   * Get CSS class for the binning category badge.
   * @param category Category string
   */
  getBinningMethodCategoryStyleClass(category) {
    return binningMethods.getBinningMethodCategoryStyleClass(category, true);
  }
}