/**
 * MainComponent (Explore, Compare, Create, Combine tabs)
 * -----------------------------------------------------
 * This Angular component is the core of the Exploropleth application. It provides the main UI and logic for:
 *   - Loading and visualizing geospatial datasets (choropleth maps)
 *   - Supporting multiple binning methods and color schemes
 *   - Allowing users to create, edit, and compare binning strategies
 *   - Interactive map painting, search, and sharing features
 *
 * The component is large and contains logic for data processing, D3/vega-lite rendering, user interaction, and state management.
 *
 * This file is organized as follows:
 *   - Imports
 *   - Component metadata and class definition
 *   - Constructor and initialization
 *   - Binning methods and color scale logic
 *   - Visualization rendering (D3, Vega-Lite)
 *   - Data loading and processing
 *   - UI event handlers (search, modals, painting, etc.)
 *   - Utility and helper functions
 *
 * For open source contributors: Please see function-level JSDoc comments and inline explanations for details.
 */
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import * as d3 from "d3";
import * as jquery from "jquery";
import * as topojson from "topojson-client";
import { AppConfig } from "src/app/app.configuration";
import { UtilsService } from "src/app/services/utils.service";
import baseGeoVisSpec from "../configurations/baseGeoVisSpec.json";
import { DialogService } from 'primeng/dynamicdialog';
import { DragulaService } from "ng2-dragula";
import { COLOR_SCHEMES } from "../configurations/colorSchemes";
import { DATASETS } from "../configurations/datasets";
import * as binningMethods from "../configurations/binningMethods";
import { DetailsModalComponent } from '../modals/detailsModal';
import { BinGuru } from "binguru";
import vegaEmbed, { Config } from "vega-embed";
import { MenuItem } from 'primeng/api';
import { ShareModalComponent } from '../modals/shareModal';

@Component({
  selector: "explore",
  templateUrl: "./component.html",
  providers: [],
  styleUrls: ["./component.scss"]
})
export class MainComponent implements OnInit {

  @ViewChild('attrDistributionVisContainer', { read: ElementRef }) attrDistributionVisContainer: ElementRef;
  @ViewChild('attrDistributionVisContainerCompare', { read: ElementRef }) attrDistributionVisContainerCompare: ElementRef;
  @ViewChild('mapContainerBrowse', { read: ElementRef }) mapContainerBrowse: ElementRef;
  @ViewChild('mapContainerCompare', { read: ElementRef }) mapContainerCompare: ElementRef;
  @ViewChild('mapContainerCombine', { read: ElementRef }) mapContainerCombine: ElementRef;
  @ViewChild('specialMapContainerCombine', { read: ElementRef }) specialMapContainerCombine: ElementRef;
  @ViewChild('mapContainerCreate', { read: ElementRef }) mapContainerCreate: ElementRef;

  visModel: Object;
  objectKeys: any;
  objectValues: any;

  constructor(
    private dragulaService: DragulaService,
    private dialogService: DialogService,
    private cd: ChangeDetectorRef
  ) {


    // Drag and Drop - helpful links below:
    // https://valor-software.com/ng2-dragula/
    // https://github.com/valor-software/ng2-dragula/issues/715
    // https://github.com/valor-software/ng2-dragula/issues/1024
    // https://github.com/valor-software/ng2-dragula/issues/885
    this.dragulaService.destroy("CHOROPLETH_DRAGGABLE_CARDDECK");
    this.dragulaService.createGroup("CHOROPLETH_DRAGGABLE_CARDDECK", {
      moves: (el, container, handle) => {
        return handle.classList.contains('drag_handle');
      }
    });

    // Helpful utilities for object operations.
    this.objectKeys = Object.keys;
    this.objectValues = Object.values;

    // Customizable properties
    this.visModel = {
      isDatasetLoaded: false,
      datasets: DATASETS,
      dataset: DATASETS[1]["geographies"][0]["features"][0], // Load a sample dataset by default.
      baseDataFeatureCollection: [],
      baseGeoVisSpec: JSON.parse(JSON.stringify(baseGeoVisSpec)),
      featureData: {},
      featureDataNaNs: {},
      featureRawDataWithNaNs: {},
      featureRawDataWithNaNsJSON: [],
      attributeDistributionVisType: "kde", // "histogram" | "kde"
      showInvalidValues: "on", // on | off
      invalidValuesColor: "#555555",
      binCount: 5,
      binInterval: 0, // will be set automatically later
      paintMode: "off",
      binningMethodResetMenu: [],
      primaryKeyAcrossBinningMethods: {},
      frequencyOfBins: {},
      frequentBins: {},
      binningMethodInputsForResiliency: {
        [binningMethods.EQUAL_INTERVAL]: { selected: true },
        [binningMethods.QUANTILE]: { selected: true },
        [binningMethods.MAXIMUM_BREAKS]: { selected: true },
        [binningMethods.FISHER_JENKS]: { selected: true },
        [binningMethods.CK_MEANS]: { selected: true },
        [binningMethods.GEOMETRIC_INTERVAL]: { selected: true }
      },
      validBinningMethodInputsForResiliency: [],
      specialBinningMethods: {
        [binningMethods.SPECIAL_MOST_FREQUENT_BIN]: {
          name: "Most Consistent Bin",
          description: [],
          binBreaks: [], binSizes: {}, colorScale: {}
        },
        [binningMethods.SPECIAL_FREQUENCY_MOST_FREQUENT_BIN]: {
          name: "Frequency of Most Consistent Bin",
          description: [],
          binBreaks: [], binSizes: {}, colorScale: {}
        },
        [binningMethods.SPECIAL_COMBINED_MOST_FREQUENT_BIN]: {
          name: "Most Consistent Bin + Frequency",
          description: [],
          binBreaks: [], binSizes: {}, colorScale: {}
        }
      },
      binGuruObj: null,
      colorSchemes: COLOR_SCHEMES,
      colorScheme: COLOR_SCHEMES[2]["examples"][2], // viridis
      binningMethodsList: [],
      activeBinningMethodsList: [],
      binningMethodCategoriesList: [],
      activeBinningMethodCategoriesList: [],
      binningMethods: binningMethods.BINNING_METHODS,
      dragMode: false,
      dataMap: new Map(),
      colorScale: null,
      currentColor: "#ffffff",
      presetColors: ["#ffffff"],
      bins: {},
      activeMainTab: "explore",
      newBinningMethodName: "",
      defaultBinningMethod: binningMethods.FISHER_JENKS,
      geographicSearchTerm: "",
      geographicSearchResults: [],
      highlightedGeographicEntity: null
    };

    // Update data binning methods and categories
    this.setActiveBinningMethods();
    this.setActiveBinningMethodCategories();
  }

  /**
   * Sets up the binning methods reset menu for the Create tab.
   */
  setBinningMethodsForResetInCreate() {
    this.visModel["binningMethodResetMenu"] = (this.visModel['binningMethodsList'] || []).map(dct => ({
      label: dct['_name'],
      command: () => this.resetCreateViewMethod(dct['_id']),
      styleClass: dct['_id'] === this.visModel['defaultBinningMethod'] ? 'bg-secondary text-white' : ''
    }));
  }

  /**
   * Resets the Create tab view to the selected binning method.
   * @param bm The binning method identifier to reset to.
   */
  resetCreateViewMethod(bm) {
    let context = this;
    context.visModel['defaultBinningMethod'] = bm;
    this.setBinningMethodsForResetInCreate();
    context.updateCurrentTab();
  }

  /**
   * Deletes a bin or all bins if _id is null.
   * @param _id The bin identifier to delete, or null to delete all bins.
   */
  deleteBin(_id = null) {
    let context = this;
    if (_id == null) {
      context.visModel["bins"] = {};
      context.visModel["bins"]["0"] = {
        "domain_from": -Infinity,
        "color": "#ffffff",
        "domain_to": Infinity
      }
    }
  }

  /**
   * Populates the list of active binning methods.
   */
  setActiveBinningMethods() {
    let context = this;
    let items = [];
    Object.keys(this.visModel["binningMethods"]).forEach(function (dct) {
      items.push({ _id: dct, _name: context.visModel["binningMethods"][dct]["name"] })
    });
    this.visModel["activeBinningMethodsList"] = items.map(item => item._id);
    this.visModel["binningMethodsList"] = [...items];
  }


  /**
   * Populates the list of active binning method categories.
   */
  setActiveBinningMethodCategories() {
    let items = [];

    [binningMethods.BINNING_METHOD_CATEGORY_INTERVAL, binningMethods.BINNING_METHOD_CATEGORY_STATISTICAL, binningMethods.BINNING_METHOD_CATEGORY_ITERATIVE, binningMethods.BINNING_METHOD_CATEGORY_HUMAN_CENTERED, binningMethods.BINNING_METHOD_CATEGORY_OTHER, binningMethods.BINNING_METHOD_CATEGORY_USER_DEFINED].forEach(function (category) {
      items.push({ _id: category, _name: category })
    });
    this.visModel["activeBinningMethodCategoriesList"] = items.map(item => item._id);
    this.visModel["binningMethodCategoriesList"] = [...items];
  }

  /**
   * Saves a new user-defined binning method based on current bins.
   */
  saveNewBinningMethod() {
    let context = this;
    const newBinningMethodName = context.visModel["newBinningMethodName"];
    const newBinningMethodNameFormatted = newBinningMethodName.replace(/\s+/g, '');

    let binBreaks = [];
    Object.keys(context.visModel["bins"]).forEach(function (binId, index) {
      if (index > 0) {
        binBreaks.push(context.visModel["bins"][binId]["domain_from"]);
      }
    });

    let scale = {};
    scale["domain"] = binBreaks;
    scale['type'] = 'threshold';
    scale['scheme'] = context.getColorScheme();

    context.visModel["binningMethods"][newBinningMethodNameFormatted] = {
      name: newBinningMethodName,
      description: "This is a user-defined binning method created at " + new Date().toUTCString() + ".",
      longDescription: "",
      binBreaks: binBreaks,
      binSizes: {}, // Will be updated later
      colorScale: scale,
      isCardHovered: false,
      isRendered: false,
      vlSpec: null,
      tsCode: null,
      category: binningMethods.BINNING_METHOD_CATEGORY_USER_DEFINED,
      isUserCreated: true,
      savedBins: { ...context.visModel["bins"] }
    }

    // Add this binning method to the list of methods in the binning methods dropdown.
    context.setActiveBinningMethods();

    // Refresh the list of binning method categories in the binning method categories dropdown.
    context.setActiveBinningMethodCategories();

    // Update the list of binning methods in the Reset menu of Create tab
    context.setBinningMethodsForResetInCreate();

    // Set this binning method as the default.
    context.visModel["defaultBinningMethod"] = newBinningMethodNameFormatted;

    // Unset the name input field.
    context.visModel["newBinningMethodName"] = "";

    // Update the tab to reflect changes
    context.updateCurrentTab();
  }


  /**
   * Hides a binning method card from the active list.
   * @param _id The binning method identifier to hide.
   */
  hideBinningMethodCard(_id) {
    let context = this;
    const bmList = [...context.visModel["activeBinningMethodsList"]];
    let index = bmList.findIndex(d => d === _id)
    if (index > -1) {
      bmList.splice(index, 1);
      context.visModel["activeBinningMethodsList"] = [...bmList];
    }
  }

  /**
   * Returns the current color scheme code or function.
   * @param type The type of color scheme to return ("vegalite" or function).
   */
  getColorScheme(type = "vegalite") {
    let context = this;
    if (type == "vegalite") {
      return context.visModel['colorScheme']["code"];
    }
    return context.visModel['colorScheme']["function"];
  }

  /**
   * Returns the color scale object for a given binning method.
   * @param binningMethod The binning method identifier.
   */
  getBinningMethodScaleObj(binningMethod) {
    let context = this;
    let binBreaks = [];
    let scale = {};
    let binGuruObj = context.visModel['binGuruObj'];

    // Check if binGuruObj is null/undefined before proceeding
    if (!binGuruObj) {
      return {
        'type': 'threshold',
        'domain': [],
        'range': ["gray"]
      };
    }

    // If this is an unclassed method, pass its min and max as domain.
    if (binningMethod == binningMethods.UNCLASSED) {
      scale['domain'] = [binGuruObj.min, binGuruObj.max];
      scale['scheme'] = context.getColorScheme();
      scale['type'] = 'linear';
      return scale;
    }

    // If this is a user-created method, use its saved binBreaks but the current color scheme (to ensure consistency when comparing with other methods)
    const method = context.visModel['binningMethods'][binningMethod];
    if (method && method.isUserCreated) {
      scale['domain'] = method.binBreaks;
      scale['scheme'] = context.getColorScheme();
      scale['type'] = 'threshold';
      return scale;
    }

    let binObj;
    switch (binningMethod) {
      case binningMethods.EQUAL_INTERVAL:
        binObj = binGuruObj.equalInterval();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.PERCENTILE:
        binObj = binGuruObj.percentile();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.QUANTILE:
        binObj = binGuruObj.quantile();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.STANDARD_DEVIATION:
        binObj = binGuruObj.standardDeviation();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.MANUAL_INTERVAL: {
        // Use random, sorted breaks between min and max as an illustration of MANUAL_INTERVAL
        const min = binGuruObj.min;
        const max = binGuruObj.max;
        const n = context.visModel['binCount'] - 1;
        const breaks = UtilsService.getRandomUniqueNumbers(min, max, n);
        binObj = binGuruObj.manualInterval(breaks.sort((a, b) => a - b));
        binBreaks = binObj.binBreaks;
        break;
      }
      case binningMethods.PRETTY_BREAKS:
        binObj = binGuruObj.prettyBreaks();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.MAXIMUM_BREAKS:
        binObj = binGuruObj.maximumBreaks();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.HEAD_TAIL_BREAKS:
        binObj = binGuruObj.headTailBreaks();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.CK_MEANS:
        binObj = binGuruObj.ckMeans();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.BOXPLOT:
        binObj = binGuruObj.boxPlot();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.DEFINED_INTERVAL:
        binObj = binGuruObj.definedInterval();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.EXPONENTIAL_BIN_SIZE:
        binObj = binGuruObj.exponentialBinSizes();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.GEOMETRIC_INTERVAL:
        binObj = binGuruObj.geometricInterval();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.FISHER_JENKS:
        binObj = binGuruObj.fisherJenks();
        binBreaks = binObj.binBreaks;
        break;
      case binningMethods.RESILIENCY:
        context.visModel["validBinningMethodInputsForResiliency"] = context.getValidBinningMethodsForSpecialComparison();
        binObj = binGuruObj.resiliency(context.visModel["validBinningMethodInputsForResiliency"]);
        binBreaks = binObj.binBreaks;
        break;
      // UNCLASSED handled above
      default:
        return {
          'type': 'threshold',
          'domain': [],
          'range': ["gray"]
        };
    }
    if (binningMethod != binningMethods.PRETTY_BREAKS) {
      binBreaks = binBreaks.map((item) => parseFloat(item.toFixed(2)));
    }
    scale['domain'] = binBreaks;
    scale['scheme'] = context.getColorScheme();
    scale['type'] = 'threshold';
    return scale;
  }

  /**
   * Computes statistics across all binning methods (e.g., most frequent bin).
   */
  computeStatsWithinAndAcrossBinningMethods() {
    let context = this;

    context.visModel["frequencyOfBins"] = {};
    context.visModel["frequentBins"] = {};
    context.visModel["primaryKeyAcrossBinningMethods"] = {};

    // Concat one view for each binning method.
    let binningMethods = Array.from(Object.keys(context.visModel['binningMethods']));
    for (let i = 0; i < binningMethods.length; i++) {
      const binningMethod = binningMethods[i];

      // Reset Class Sizes;
      context.visModel['binningMethods'][binningMethod]['binSizes'] = {};

      // Get scale for the Vega-Lite spec
      const scale = context.visModel['binningMethods'][binningMethod]['colorScale'];

      // Iterate through all values for the current feature/attribute.
      // Where to put NaNs / nulls? For now, just ignore them; we need valindex hence still need to iterate over all.
      context.visModel['featureRawDataWithNaNs'][context.visModel["dataset"]["feature"]].forEach(function (val, valindex) {
        if (!Number.isNaN(val) && val != null && val != "NA") {
          let primaryKey = context.visModel['featureRawDataWithNaNs'][context.visModel["dataset"]["primaryKey"]][valindex];

          // We want 1 index, not 0 index.
          let binID = 1;
          if (!(binID in context.visModel['binningMethods'][binningMethod]['binSizes'])) {
            context.visModel['binningMethods'][binningMethod]['binSizes'][binID] = 0;
          }
          for (let i = binID; i < scale['domain'].length + 1; i++) {
            if (scale['domain'][i - 1] <= val) {
              binID = i + 1;
              if (!(binID in context.visModel['binningMethods'][binningMethod]['binSizes'])) {
                context.visModel['binningMethods'][binningMethod]['binSizes'][binID] = 0;
              }
            }
          }

          // Increment the binSizes counter for each classIndex.
          context.visModel['binningMethods'][binningMethod]['binSizes'][binID] += 1;

          // Create a datastructure that, for each FIPS_Code, has its corresponding bin (out of `binSize`). Note that this will only be applicable for those binning methods that rely on the user manually setting the `binSize` (commonly 5).
          // The checkbox selection from the `Compare` tab.
          if (context.visModel["validBinningMethodInputsForResiliency"].indexOf(binningMethod) !== -1) {
            if (!(primaryKey in context.visModel["primaryKeyAcrossBinningMethods"])) {
              context.visModel["primaryKeyAcrossBinningMethods"][primaryKey] = {};
            }
            context.visModel["primaryKeyAcrossBinningMethods"][primaryKey][binningMethod] = binID;
            let binsArrayAcrossBinningMethods = Object.values(context.visModel["primaryKeyAcrossBinningMethods"][primaryKey]);

            if (!(primaryKey in context.visModel["frequencyOfBins"])) {
              context.visModel["frequencyOfBins"][primaryKey] = 0;
            }
            context.visModel["frequencyOfBins"][primaryKey] = UtilsService.getFrequencyOfMostFrequentElement(binsArrayAcrossBinningMethods);

            if (!(primaryKey in context.visModel["frequencyOfBins"])) {
              context.visModel["frequencyOfBins"][primaryKey] = 0;
            }
            context.visModel["frequentBins"][primaryKey] = UtilsService.getMostFrequentElement(binsArrayAcrossBinningMethods);
          }
        }
      });
    }
  }

  /**
   * Determines if a binning method matches the current search filter.
   * @param binningMethod The binning method identifier.
   */
  isMatchingSearchFilter(binningMethod) {
    let context = this;

    for (var j = 0; j < context.visModel["activeBinningMethodCategoriesList"].length; j++) {
      if (context.visModel["activeBinningMethodCategoriesList"][j] == context.visModel["binningMethods"][binningMethod]["category"]) {
        for (var i = 0; i < context.visModel["activeBinningMethodsList"].length; i++) {
          if (context.visModel["activeBinningMethodsList"][i] == binningMethod) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Prepares the Vega-Lite specification for the Explore tab visualizations.
   */
  prepareVISSpec() {
    let context = this;

    // Reset  frequencies
    context.visModel["frequencyOfBins"] = {};
    context.visModel["frequentBins"] = {};

    // Concat one view for each binning method.
    let binningMethods = Array.from(Object.keys(context.visModel['binningMethods']));

    // Now render them
    for (let i = 0; i < binningMethods.length; i++) {
      const binningMethod = binningMethods[i];

      // Prepare Base VIS Spec
      context.prepareBaseVISSpec();

      // Reset Bin Sizes;
      context.visModel['binningMethods'][binningMethod]['binSizes'] = {};

      // Get scale for the Vega-Lite spec
      const scale = context.visModel['binningMethods'][binningMethod]['colorScale'];
      let obj2Concat = context.getVLObject(scale);

      // Iterate through all values for the current feature/attribute.
      // Where to put NaNs / nulls? For now, just ignore them; we need valindex hence still need to iterate over all.
      context.visModel['featureRawDataWithNaNs'][context.visModel["dataset"]["feature"]].forEach(function (val, valindex) {
        if (!Number.isNaN(val) && val != null && val != "NA") {
          let primaryKey = context.visModel['featureRawDataWithNaNs'][context.visModel["dataset"]["primaryKey"]][valindex];

          // We want 1 index, not 0 index.
          let binID = 1;
          if (!(binID in context.visModel['binningMethods'][binningMethod]['binSizes'])) {
            context.visModel['binningMethods'][binningMethod]['binSizes'][binID] = 0;
          }
          for (let i = binID; i < scale['domain'].length + 1; i++) {
            if (scale['domain'][i - 1] < val) {
              binID = i + 1;
              if (!(binID in context.visModel['binningMethods'][binningMethod]['binSizes'])) {
                context.visModel['binningMethods'][binningMethod]['binSizes'][binID] = 0;
              }
            }
          }

          // Increment the binSizes counter for each binID.
          context.visModel['binningMethods'][binningMethod]['binSizes'][binID] += 1;

          // Create a datastructure that, for each FIPS_Code, has its corresponding bin (out of `binSize`). Note that this will only be applicable for those binning methods that rely on the user manually setting the `binSize` (commonly 5).
          if (binningMethod in context.visModel['binningMethodInputsForResiliency']) {
            if (!(primaryKey in context.visModel["primaryKeyAcrossBinningMethods"])) {
              context.visModel["primaryKeyAcrossBinningMethods"][primaryKey] = {};
            }
            context.visModel["primaryKeyAcrossBinningMethods"][primaryKey][binningMethod] = binID;
            let binsArrayAcrossBinningMethods = Object.values(context.visModel["primaryKeyAcrossBinningMethods"][primaryKey]);

            if (!(primaryKey in context.visModel["frequencyOfBins"])) {
              context.visModel["frequencyOfBins"][primaryKey] = 0;
            }
            context.visModel["frequencyOfBins"][primaryKey] = UtilsService.getFrequencyOfMostFrequentElement(binsArrayAcrossBinningMethods);

            if (!(primaryKey in context.visModel["frequencyOfBins"])) {
              context.visModel["frequencyOfBins"][primaryKey] = 0;
            }
            context.visModel["frequentBins"][primaryKey] = UtilsService.getMostFrequentElement(binsArrayAcrossBinningMethods);
          }
        }
      });

      // Add vlSpec to the concat array
      context.visModel["baseGeoVisSpec"]["concat"].push(obj2Concat);
      context.visModel['binningMethods'][binningMethod]["vlSpec"] = JSON.stringify(context.visModel["baseGeoVisSpec"], null, 4);

      vegaEmbed("#mapContainerBrowse-" + binningMethod, context.visModel["baseGeoVisSpec"], AppConfig.vegaLiteOptions)
        .then(result => {
          context.visModel['binningMethods'][binningMethod]["isRendered"] = true;
        })
        .catch(console.warn);
    }
  }

  /**
   * Opens the details modal for a given binning method.
   * @param dct_id The binning method identifier.
   */
  openDetailViewModal(dct_id) {
    let context = this;

    const dialogRef = this.dialogService.open(DetailsModalComponent, {
      header: "Details of Binning Method - " + context.visModel['binningMethods'][dct_id]['name'],
      width: '60%',
      height: '70%',
      modal: true,
      closeOnEscape: false,
      dismissableMask: false,
      data: {
        binningMethodObj: context.visModel['binningMethods'][dct_id],
        vlSpec: context.visModel['binningMethods'][dct_id]['vlSpec']
      }
    });

    dialogRef.onClose.subscribe(() => {
      // Clean up if needed
    });

    // Wait for dialog to be fully rendered
    setTimeout(() => {
      const vlSpec = JSON.parse(context.visModel['binningMethods'][dct_id]['vlSpec']);
      const dialogElement = document.querySelector('.p-dialog-content');

      if (dialogElement) {
        const fullscreenCanvas = dialogElement.querySelector('#detailViewMapContainer');
        if (fullscreenCanvas) {
          vlSpec["concat"][0]["width"] = ((fullscreenCanvas.parentNode as HTMLElement).offsetWidth - 100) * 0.7;
          vlSpec["concat"][0]["height"] = vlSpec["concat"][0]["width"] * 0.66;
          vegaEmbed("#detailViewMapContainer", vlSpec, AppConfig.vegaLiteOptions)
            .then(result => { })
            .catch(console.warn);
        }
      }
    }, 100);

  }

  /**
   * Returns the shape of the data (total, valid, invalid, or invalid percentage).
   * @param type The type of data shape to return.
   */
  getDataShape(type = "total") {
    let context = this;
    let response;
    try {
      const valid = context.visModel['featureData'][context.visModel["dataset"]["feature"]].length;
      const invalid = context.visModel['featureDataNaNs'][context.visModel["dataset"]["feature"]];
      let total = valid + invalid;
      switch (type) {
        case "total":
          response = total;
          break;
        case "valid":
          response = valid;
          break;
        case "invalid":
          response = invalid;
          break;
        case "invalidpct":
          response = (invalid * 100 / total).toPrecision(3);
          break;
      }
    } catch (err) {
      response = -1;
    }
    return response;
  }

  /**
   * Returns a Vega-Lite object for a given color scale.
   * @param scale The color scale object.
   */
  getVLObject(scale) {
    let context = this;
    let width = context.mapContainerBrowse.nativeElement.parentNode.offsetWidth - 100;
    let height = width * 0.7;

    let obj2Concat = {
      "width": width,
      "height": height,
      "layer": [{
        "projection": {
          "type": context.visModel["dataset"]["mapProjection"],
          // "fit": context.visModel['baseDataFeatureCollection'], // Not needed.
          "center": context.visModel["dataset"]['mapCenter']
        },
        "mark": {
          "type": "geoshape",
          "invalid": context.visModel['showInvalidValues'] == "on" ? null : "filter", // If set to `null`, then all affected marks are included and treated as zeroes. If set to 'filter', all affected marks are filtered out, e.g., geoshapes associated with Lake Michigan near Chicago. Note: To color these marks as grey or some other color instead, set this value to `null` and then uncomment the "condition" under "color" below.
        },
        "encoding": {
          "color": {
            "condition": {
              "test": "!isValid(datum['" + context.visModel["dataset"]["feature"] + "'])", // Uncomment this along with setting the "invalid" mark property above to `null`
              "value": context.visModel['invalidValuesColor']
            },
            "field": context.visModel["dataset"]["feature"],
            "type": "quantitative",
            "legend": {
              "title": null,
              direction: "vertical",
              orient: "right",
              "labelFontSize": 14
            },
            // "legend": null, // Legend takes width that messes up the `width` computation. Unfortunately, Vega-Lite doesn't do the `autosize` stuff well for concatenated views such as these; hence, legend is disabled.
            "scale": scale
          },
          "tooltip": context.getMapTooltip("vl")
        }
      }]
    }

    return obj2Concat;
  }

  /**
   * Returns the list of valid binning methods for special comparison.
   */
  getValidBinningMethodsForSpecialComparison() {
    let context = this;
    let arr = [];
    Object.keys(context.visModel["binningMethodInputsForResiliency"]).forEach(function (key) {
      if (context.visModel["binningMethodInputsForResiliency"][key]["selected"]) arr.push(key);
    });
    return arr;
  }

  /**
   * Prepares the special visualization for combined binning methods.
   */
  prepareSpecialVIS() {
    let context = this;
    let combinedJSON = [];
    let tooltips = [];

    // Prepare the data to be bound to the visualization
    Object.keys(context.visModel["frequencyOfBins"]).forEach(function (primaryKey) {
      let obj = {
        "Frequency_of_Most_Frequent_Bin": context.visModel["frequencyOfBins"][primaryKey],
        "Most_Frequent_Bin": context.visModel["frequentBins"][primaryKey]
      };
      obj[context.visModel["dataset"]["primaryKey"]] = primaryKey;

      context.visModel["validBinningMethodInputsForResiliency"].forEach(function (binningMethod) {
        obj[binningMethod] = context.visModel["primaryKeyAcrossBinningMethods"][primaryKey][binningMethod];
        tooltips.push({
          "field": binningMethod,
          "type": "ordinal",
          "title": "BinID(" + context.visModel['binningMethods'][binningMethod]['name'] + ")"
        });
      });
      combinedJSON.push(obj);
    });

    // Override number of columns.
    const noOfColumns = 3;
    context.visModel["baseGeoVisSpec"]["columns"] = noOfColumns;

    // Bind the data to the Vega-Lite specification
    context.visModel["baseGeoVisSpec"]["transform"].push({
      "lookup": context.visModel["dataset"]["topoPrimaryKey"],
      "from": {
        "data": {
          "values": combinedJSON
        },
        "key": context.visModel["dataset"]["primaryKey"],
        "fields": ["Frequency_of_Most_Frequent_Bin", "Most_Frequent_Bin", context.visModel["dataset"]["primaryKey"], ...context.visModel["validBinningMethodInputsForResiliency"]]
      }
    });

    let width = (context.specialMapContainerCombine.nativeElement.parentNode.offsetWidth / noOfColumns) - 10 - 30 - 100; // adjustments for spacing
    let height = width * 0.66;

    // Loop over the special binning methods
    Object.keys(context.visModel["specialBinningMethods"]).forEach(function (specialBinningMethod) {

      let obj2Concat = {
        "width": width,
        "height": height,
        "layer": [{
          "title": {
            "text": context.visModel["specialBinningMethods"][specialBinningMethod]['name'],
            "subtitle": "across multiple binning methods.",
            "fontSize": 18,
            "subtitleFontSize": 14,
            "color": "#34495e",
            "dy": 0
          },
          "projection": {
            "type": context.visModel["dataset"]["mapProjection"],
            // "fit": context.visModel['baseDataFeatureCollection'], // Not needed.
            "center": context.visModel["dataset"]['mapCenter']
          },
          "mark": {
            "type": "geoshape",
            "invalid": context.visModel['showInvalidValues'] == "on" ? null : "filter", // If set to `null`, then all affected marks are included and treated as zeroes. If set to 'filter', all affected marks are filtered out, e.g., geoshapes associated with Lake Michigan near Chicago.
          },
          "encoding": {
            "color": {
              // Note: This color condition works but the legend shows this condition's color in the opacity channel which can be misleading; this color is just for NaN/null, not the entire map. Bug, maybe?
              "condition": {
                "test": "!isValid(datum['Frequency_of_Most_Frequent_Bin'])", // Uncomment this along with setting the "invalid" mark property above to `null`
                "value": context.visModel['invalidValuesColor']
              },
              "field": "Most_Frequent_Bin",
              "type": "ordinal",
              "legend": {
                "title": "Bin",
                "titleFontSize": 16,
                "labelFontSize": 16,
              },
              "scale": {
                "domain": [...Array(context.visModel['binCount']).keys()].map(x => x += 1),
                "type": 'ordinal',
                "scheme": context.getColorScheme()
              }
            },
            "opacity": {
              "field": "Frequency_of_Most_Frequent_Bin",
              "type": "quantitative",
              "legend": {
                "title": "Freq",
                "values": new Array(context.visModel["validBinningMethodInputsForResiliency"].length).fill(null).map((_, i) => i + 1),
                "titleFontSize": 16,
                "labelFontSize": 16,
              },
              "scale": {
                "domain": [1, context.visModel["validBinningMethodInputsForResiliency"].length],
                "range": [0.1, 1],
                "type": 'pow',
              }
            },
            "tooltip": [
              ...context.getMapTooltip("vl"),
              { "field": "Most_Frequent_Bin", "type": "ordinal", "title": "Most Frequent Bin" },
              { "field": "Frequency_of_Most_Frequent_Bin", "type": "ordinal", "title": "Frequency of Most Frequent Bin" },
              ...tooltips
            ]
          }
        }],
      }

      // Remove "condition" spec within color if invalidValues are supposed to be hidden.
      if (context.visModel["showInvalidValues"] == "off") {
        delete obj2Concat["layer"][0]["encoding"]["color"]["condition"];
      }

      // Remove "opacity" encoding for SPECIAL_MOST_FREQUENT_BIN
      if (specialBinningMethod == binningMethods.SPECIAL_MOST_FREQUENT_BIN) {
        delete obj2Concat["layer"][0]["encoding"]["opacity"];
      }

      // Remove "color" encoding for SPECIAL_FREQUENCY_MOST_FREQUENT_BIN
      if (specialBinningMethod == binningMethods.SPECIAL_FREQUENCY_MOST_FREQUENT_BIN) {
        // This works, but it removes the `condition` to hide/show nans/nulls which is annoying.
        obj2Concat["layer"][0]["mark"]["fill"] = "black";
        delete obj2Concat["layer"][0]["encoding"]["color"];

        // HACK: Let the encoding channel stay but override it's scale and domain.
        // obj2Concat["layer"][0]["encoding"]["color"]["scale"] = {
        //   "domain": [...Array(context.visModel['binCount']).keys()].map(x => x += 1),
        //   "type": "category",
        //   "range": [...Array(context.visModel['binCount']).keys()].map(x => "black"),
        // } as any;
      }

      // add it to the spec
      context.visModel["baseGeoVisSpec"]["concat"].push(obj2Concat);

    });

  }


  /**
   * Returns the tooltip configuration for the map visualization.
   * @param visType The visualization type ("vl" or "d3").
   * @param dobj Optional data object for d3 tooltips.
   */
  getMapTooltip(visType, dobj = null) {
    let context = this;
    let tooltipContent = null;

    switch (visType) {
      case "vl":
        tooltipContent = [];
        // Feature
        tooltipContent.push({ "field": context.visModel["dataset"]["feature"], "type": "quantitative", "title": context.visModel["dataset"]["feature"], "format": ".2f" });
        // Primary Key
        tooltipContent.push({ "field": context.visModel["dataset"]["primaryKey"], "type": "nominal", "title": context.visModel["dataset"]["primaryKey"] });
        // Label Features
        context.visModel["dataset"]["labelFeatures"].forEach(function (feat) {
          tooltipContent.push({ "field": feat, "type": "nominal", "title": feat }); // ToDo: datatype is nominal for now.
        });

        break;
      case "d3":
        let tableRows = [];
        // Feature
        tableRows.push(`
          <tr>
            <td class='text-right text-muted'>${context.visModel["dataset"]["feature"]}</td>
            <td>${d3.format(".2f")(dobj[context.visModel["dataset"]["feature"]])}</td>
          </tr>`
        )
        // Primary Key
        tableRows.push(`
          <tr>
            <td class='text-right text-muted'>${context.visModel["dataset"]["primaryKey"]}</td>
            <td>${dobj[context.visModel["dataset"]["primaryKey"]]}</td>
          </tr>`
        )
        // Label Features
        context.visModel["dataset"]["labelFeatures"].forEach(function (feat) {
          tableRows.push(`
            <tr>
              <td class='text-right text-muted'>${feat}</td>
              <td>${dobj[feat]}</td>
            </tr>`
          ); // ToDo: datatype is nominal for now.
        });

        tooltipContent = `<table class="table table-sm table-borderless mb-0">${tableRows.join('')}</table>`
        break;
    }
    return tooltipContent;
  }

  /**
   * Returns the style class for a binning method category.
   * @param category The binning method category.
   */
  getBinningMethodCategoryStyleClass(category) {
    return binningMethods.getBinningMethodCategoryStyleClass(category, false);
  }

  /**
   * Prepares the resiliency visualization for the Combine tab.
   */
  prepareResiliencyVIS() {
    let context = this;

    // Bin breaks and sizes and colorScheme
    let scale = context.visModel['binningMethods'][binningMethods.RESILIENCY]['colorScale'];

    // VIS Size
    let width = context.mapContainerCombine.nativeElement.parentNode.offsetWidth - 10 - 30 - 100; // adjustments for spacing
    let height = width * 0.4;

    let obj2Concat = {
      "width": width,
      "height": height,
      "layer": [{
        "title": {
          "text": context.visModel['binningMethods'][binningMethods.RESILIENCY]['name'],
          "subtitle": ["Geographies are placed in their most agreed-upon bin across multiple binning methods."], // set below after the binSizes are computed
          "limit": width - 20, // for DEFINED_INTERVAL, the resultant binCount can be so huge that a limit to the subtitle text is necessary.
          "fontSize": 22,
          "subtitleFontSize": 18,
          "color": "#34495e",
          "dy": 0
        },
        "projection": {
          "type": context.visModel["dataset"]["mapProjection"],
          // "fit": context.visModel['baseDataFeatureCollection'], // Not needed.
          "center": context.visModel["dataset"]['mapCenter']
        },
        "mark": {
          "type": "geoshape",
          "invalid": context.visModel['showInvalidValues'] == "on" ? null : "filter", // If set to `null`, then all affected marks are included and treated as zeroes. If set to 'filter', all affected marks are filtered out, e.g., geoshapes associated with Lake Michigan near Chicago. Note: To color these marks as grey or some other color instead, set this value to `null` and then uncomment the "condition" under "color" below.
        },
        "encoding": {
          "color": {
            "condition": {
              "test": "!isValid(datum['" + context.visModel["dataset"]["feature"] + "'])", // Uncomment this along with setting the "invalid" mark property above to `null`
              "value": context.visModel['invalidValuesColor']
            },
            "field": context.visModel["dataset"]["feature"],
            "type": "quantitative",
            "legend": {
              "title": null,
              "format": ".3f",
              "labelFontSize": 16
            },
            // "legend": null, // Legend takes width that messes up the `width` computation. Unfortunately, Vega-Lite doesn't do the `autosize` stuff well for concatenated views such as these; hence, legend is disabled.
            "scale": scale
          },
          "tooltip": context.getMapTooltip("vl")
        }
      }]
    }


    // Iterate through all values for the current feature/attribute.
    // Where to put NaNs / nulls? For now, just ignore them; we need valindex hence still need to iterate over all.
    context.visModel['featureRawDataWithNaNs'][context.visModel["dataset"]["feature"]].forEach(function (val, valindex) {
      if (!Number.isNaN(val) && val != null && val != "NA") {
        let primaryKey = context.visModel['featureRawDataWithNaNs'][context.visModel["dataset"]["primaryKey"]][valindex];

        // We want 1 index, not 0 index.
        let binID = 1;
        if (!(binID in context.visModel['binningMethods'][binningMethods.RESILIENCY]['binSizes'])) {
          context.visModel['binningMethods'][binningMethods.RESILIENCY]['binSizes'][binID] = 0;
        }
        for (let i = binID; i < scale['domain'].length + 1; i++) {
          if (scale['domain'][i - 1] < val) {
            binID = i + 1;
            if (!(binID in context.visModel['binningMethods'][binningMethods.RESILIENCY]['binSizes'])) {
              context.visModel['binningMethods'][binningMethods.RESILIENCY]['binSizes'][binID] = 0;
            }
          }
        }

        // Increment the binSizes counter for each binID.
        context.visModel['binningMethods'][binningMethods.RESILIENCY]['binSizes'][binID] += 1;
      }
    });

    // add it to the spec
    context.visModel["baseGeoVisSpec"]["concat"].push(obj2Concat);

  }

  /**
   * Renders the attribute distribution visualization (histogram or KDE).
   */
  renderAttrDistributionVisSpec() {
    let context = this;
    let spec = null, width, height, invalidPlotWidth;

    invalidPlotWidth = 20;
    width = (context.attrDistributionVisContainer.nativeElement.offsetWidth) - 60; // adjustments for spacing
    width = context.visModel['showInvalidValues'] == "off" ? width : width - 4 * invalidPlotWidth;
    height = width * 0.6;

    let invalidCount = context.getDataShape("invalid");

    // Generate histogram bins using D3
    let histogramBins = context.generateHistogramBins();
    let maxBinCount = d3.max(histogramBins, (d: any) => d.count) || 0;
    let yrange = [0, maxBinCount > invalidCount ? maxBinCount : invalidCount];

    switch (context.visModel['attributeDistributionVisType']) {
      case "histogram":
        spec = {
          "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
          "data": { "values": histogramBins },
          "config": {
            "concat": {
              "spacing": 0
            }
          },
          "concat": [{
            "width": width,
            "height": height,
            "mark": {
              "type": "bar",
              "tooltip": { "content": "data" }
            },
            "encoding": {
              "x": {
                "field": "bin_start",
                "bin": { "binned": true },
                "title": null,
                "type": "quantitative",
                "axis": {
                  "labelFontSize": 12,
                  "titleFontSize": 14
                }
              },
              "x2": {
                "field": "bin_end",
                "axis": {
                  "labelFontSize": 12,
                  "titleFontSize": 14
                }
              },
              "y": {
                "field": "count",
                "title": "count",
                "type": "quantitative",
                "scale": {
                  "domain": yrange
                },
                "axis": {
                  "formatType": "number",
                  "format": ".2s",
                  "labelFontSize": 12,
                  "titleFontSize": 14
                }
              }
            }
          }]
        }
        break;

      case "kde":
        spec = {
          "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
          "data": { "values": context.visModel['featureData'][context.visModel["dataset"]["feature"]] },
          "config": {
            "concat": {
              "spacing": 0
            }
          },
          "concat": [{
            "width": width,
            "height": height,
            "mark": {
              "type": "area",
              // "tooltip": { "content": "data" }
            },
            "transform": [{
              "density": "data"
              // "bandwidth": 0 // leaving this unspecified or 0 will automatically assign a suitable value
            }],
            "encoding": {
              "x": {
                "field": "value",
                "title": null,
                "type": "quantitative",
                "axis": {
                  "labelFontSize": 12,
                  "titleFontSize": 14
                }
              },
              "y": {
                "field": "density",
                "title": "kernel density",
                "type": "quantitative",
                "axis": {
                  "formatType": "number",
                  "format": ".2s",
                  "labelFontSize": 12,
                  "titleFontSize": 14
                }
              },
              "tooltip": [
                { "field": "value", "type": "quantitative", "format": ".2s" },
                { "field": "density", "type": "quantitative", "format": ".2s" },
              ]
            }
          }]
        }

        break;
    }

    if (context.visModel["showInvalidValues"] == "on") {
      spec["concat"].push({
        "width": invalidPlotWidth,
        "height": height,
        "data": { "values": [{ "field": "NaN/nulls", "invalidCount": invalidCount }] },
        "mark": {
          "type": "bar",
          "tooltip": { "content": "invalidCount" }
        },
        "encoding": {
          "x": {
            "field": "field",
            "type": "nominal",
            "title": null,
            "axis": {
              "labelAngle": "0",
              "labelFontSize": 12,
              "titleFontSize": 14
            }
          },
          "y": {
            "field": "invalidCount",
            "type": "quantitative",
            "title": "count",
            "scale": {
              "domain": yrange,
            },
            "axis": {
              "orient": "right",
              "formatType": "number",
              "format": ".2s",
              "labelFontSize": 12,
              "titleFontSize": 14
              // "labels": false,
              // "ticks": false,
            }
          }
        }
      }
      );
    }

    // Render (or embed) Vega-Lite spec.
    vegaEmbed("#attrDistributionVisContainer", spec, AppConfig.vegaLiteOptions)
      .then(result => { })
      .catch(console.warn);

  }

  /**
   * Renders the attribute distribution visualization for the Compare tab using D3.
   */
  renderCompareTabAttrDistributionVisSpec() {
    let context = this;

    let container = '#attrDistributionVisContainerCompare';
    let width = context.attrDistributionVisContainerCompare.nativeElement.offsetWidth;
    let binCount = 20;
    let height = 200;
    let margin = { top: 30, right: 5, bottom: 50, left: 60 };

    d3.select(container).selectAll('*').remove();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale domain based on data extent
    let data = context.visModel['binGuruObj'].data;
    let title = context.visModel["dataset"]["feature"];
    const xDomain = d3.extent(data);

    // Automatically calculate dotRadius based on plotWidth and binCount
    const dotRadius = Math.min(4, plotWidth / (binCount * 2)); // Ensure dots touch horizontally
    const dotDiameter = dotRadius * 2;

    // Adjust binCount to fit plotWidth exactly with dotDiameter bins
    const adjustedBinCount = Math.max(binCount, Math.floor(plotWidth / dotDiameter));

    // Recompute x scale to match adjusted bin count and bin width
    const x = d3.scaleLinear()
      .domain(xDomain as any)
      .nice(adjustedBinCount)
      .range([0, adjustedBinCount * dotDiameter]);

    // Create bins with adjustedBinCount using D3 histogram
    const bins = d3.bin()
      .domain(x.domain() as any)
      .thresholds(adjustedBinCount)(data);

    // Automatically calculate normalizeFactor based on data and chart height
    const maxDataCount = d3.max(bins, d => d.length);
    const maxVerticalDots = Math.floor(plotHeight / dotDiameter);
    const normalizeFactor = Math.ceil(maxDataCount / maxVerticalDots);

    // Calculate dot counts per bin normalized
    bins.forEach((bin: any) => {
      bin.dotCount = Math.ceil(bin.length / normalizeFactor);
    });

    const maxStack = d3.max(bins, (d: any) => d.dotCount);

    // Y scale: vertical stacking, each step = dotDiameter
    const y = d3.scaleLinear()
      .domain([0, maxStack])
      .range([plotHeight, plotHeight - maxStack * dotDiameter]);

    // Custom formatter to display numbers as 1k, 1m, 1b, etc.
    const formatTick = (d) => {
      const units = [
        { value: 1e12, suffix: 'T' }, // Trillion
        { value: 1e9, suffix: 'B' },  // Billion
        { value: 1e6, suffix: 'M' },  // Million
        { value: 1e3, suffix: 'k' }   // Thousand
      ];

      // Find the appropriate unit for the number
      for (const unit of units) {
        if (Math.abs(d) >= unit.value) {
          return `${(d / unit.value).toFixed(1)}${unit.suffix}`;
        }
      }
      return d; // Return the number as is for values less than 1000
    };

    // X axis with ticks at bin centers, reduced to 10 ticks
    const xAxis = d3.axisBottom(x)
      .ticks(10)
      .tickSizeOuter(0)
      .tickFormat(formatTick);
    // .tickFormat(d3.format(".2f"));

    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${plotHeight})`)
      .call(xAxis);

    xAxisG.selectAll("text") // Select all tick labels
      .style("font-size", '1.9em') // Increase font size of x-axis ticks
      .style("font-family", "Arial, sans-serif");

    xAxisG.call(g => g.append('text')
      .attr('x', plotWidth / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .attr('font-weight', 'bold')
      .style('font-size', '2em')
      .text(title));

    // Y axis showing counts scaled by normalizeFactor
    const yAxisScale = d3.scaleLinear()
      .domain([0, maxStack * normalizeFactor])
      .range([plotHeight, plotHeight - maxStack * dotDiameter]);

    const yAxis = d3.axisLeft(yAxisScale)
      // .ticks(maxStack)
      .ticks(5)
      .tickSizeOuter(0)
      .tickFormat(d3.format("~s"));

    const yAxisG = g.append('g')
      .call(yAxis);

    yAxisG.selectAll("text") // Select all tick labels
      .style("font-size", '1.9em') // Increase font size of y-axis ticks
      .style("font-family", "Arial, sans-serif");

    yAxisG.call(g => g.append('text')
      .attr('x', -margin.left + 15)
      .attr('y', plotHeight / 2)
      .attr('fill', 'black')
      .attr('text-anchor', 'middle')
      .attr('transform', `rotate(-90, ${-margin.left + 15}, ${plotHeight / 2})`)
      .attr('font-weight', 'bold')
      .style('font-size', '2em')
      .text('Count'));

    // Tooltip div
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // Draw dots stacked per bin
    bins.forEach((bin: any, i) => {
      for (let j = 0; j < bin.dotCount; j++) {
        g.append('circle')
          .attr('class', 'dot')
          .style('fill', '#4C78A8')
          .style('stroke', 'black')
          .attr('cx', x(bin.x0) + dotRadius) // Use the x scale to position dots
          .attr('cy', plotHeight - j * dotDiameter - dotRadius) // stack from bottom up
          .attr('r', dotRadius)
          .on('mouseover', function (event) {
            tooltip.transition().duration(200).style('opacity', 0.9);
            tooltip.html(
              `Bin Range: [${bin.x0.toFixed(2)}, ${bin.x1.toFixed(2)})<br>` +
              `# Data Points (in Bin): ${bin.length}<br>` +
              `# Dots: ${bin.dotCount}<br>` +
              `(1 blue dot ~ upto ${normalizeFactor} Data Points)`
            )
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', function () {
            tooltip.transition().duration(500).style('opacity', 0);
          });
      }
    });

    // Adjust the x-axis range to include the full width of the last bin's dots
    svg.attr('width', (adjustedBinCount * dotDiameter) + (2 * dotRadius) + margin.left + margin.right);

  }

  /**
   * Computes bin breaks and statistics for all binning methods.
   */
  computeStats() {
    let context = this;

    // Compute Bin Breaks
    context.computeBinBreaks();

    // Compute Stats Across Binning Methods, e.g., Most Frequent Bin, Frequency of Most Frequent Bin
    // Reset variables    
    context.computeStatsWithinAndAcrossBinningMethods();

  }

  /**
   * Prepares the base Vega-Lite specification for map visualizations.
   */
  prepareBaseVISSpec() {
    let context = this;
    // Start with the visModel["baseGeoVisSpec"]
    context.visModel["baseGeoVisSpec"] = JSON.parse(JSON.stringify(baseGeoVisSpec));

    // Set number of columns in the grid
    context.visModel["baseGeoVisSpec"]["columns"] = 1;
    // context.visModel["baseGeoVisSpec"]["columns"] = context.visModel['columns'];

    // Check if this is an uploaded dataset
    if (context.visModel["dataset"]["geoData"]) {
      // For uploaded datasets, use the data directly instead of loading from files
      context.visModel["baseGeoVisSpec"]["data"]["values"] = context.visModel["dataset"]["geoData"];
      context.visModel["baseGeoVisSpec"]["data"]["format"]["type"] = "json";
      context.visModel["baseGeoVisSpec"]["data"]["format"]["feature"] = "features";
    } else {
      // For sample datasets, use the original file-based approach
      context.visModel["baseGeoVisSpec"]["data"]["url"] = AppConfig['dataPath'] + context.visModel["dataset"]["geoFile"];
      context.visModel["baseGeoVisSpec"]["data"]["format"]["feature"] = context.visModel["dataset"]["topoFeatureRootKey"];
    }

    // context.visModel["baseGeoVisSpec"]["transform"][0]["from"]["data"]["url"] = AppConfig['dataPath'] + context.visModel["dataset"]["featureFile"];
    delete context.visModel["baseGeoVisSpec"]["transform"][0]["from"]["data"]["url"];
    // Filter the data to only include the primary key, label features, and selected feature
    const selectedFeature = context.visModel["dataset"]["feature"];
    const primaryKey = context.visModel["dataset"]["primaryKey"];
    const labelFeatures = context.visModel["dataset"]["labelFeatures"] || [];
    const allowedFields = [primaryKey, ...labelFeatures, selectedFeature];

    context.visModel["baseGeoVisSpec"]["transform"][0]["from"]["fields"] = allowedFields;
    context.visModel["baseGeoVisSpec"]["transform"][0]["from"]["data"]["values"] = context.visModel['featureRawDataWithNaNsJSON'].map(row => {
      const filteredRow = {};
      allowedFields.forEach(field => {
        if (row.hasOwnProperty(field)) filteredRow[field] = row[field];
      });
      return filteredRow;
    });
    context.visModel["baseGeoVisSpec"]["transform"][0]["from"]["key"] = context.visModel["dataset"]["primaryKey"];
    context.visModel["baseGeoVisSpec"]["transform"][0]["lookup"] = context.visModel["dataset"]["topoPrimaryKey"];

  }

  /**
   * Computes bin breaks and color scales for all binning methods.
   */
  computeBinBreaks() {
    let context = this;
    // Concat one view for each binning method.
    let binningMethods = Array.from(Object.keys(context.visModel['binningMethods']));
    for (let i = 0; i < binningMethods.length; i++) {
      const binningMethod = binningMethods[i];
      let scale = context.getBinningMethodScaleObj(binningMethod);
      context.visModel['binningMethods'][binningMethod]["binBreaks"] = scale["domain"];
      context.visModel['binningMethods'][binningMethod]["colorScale"] = scale;
    }
  }

  /**
   * Renders the comparison visualization for the Compare tab.
   */
  renderCompareVIS() {
    let context = this;
    if (context.visModel['activeMainTab'] != "compare") return;

    context.renderCompareTabAttrDistributionVisSpec();

    let noOfBinningMethods = context.visModel['activeBinningMethodsList'].length;
    let width = context.mapContainerCompare.nativeElement.parentNode.parentNode.offsetWidth - 250;
    let heightOfEachBinningMethodBar = 30;

    /** 
     * Important match because `boxPlot` and `standardDeviation` are such that their extents can cross the dataMin and dataMax. 
     * Hence, compute [binMin, binMax]
     */
    let dataMin = context.visModel['binGuruObj'].min;
    let dataMax = context.visModel['binGuruObj'].max;
    let [binMin, binMax] = [Infinity, -Infinity];
    for (var j = 0; j < noOfBinningMethods; j++) {
      const binningMethod = context.visModel['activeBinningMethodsList'][j];
      const binBreaks = context.visModel['binningMethods'][binningMethod]["binBreaks"];
      for (var i = 0; i < binBreaks.length; i++) {
        let val = binBreaks[i];
        if (binMin > val) {
          binMin = val;
        }
        if (binMax < val) {
          binMax = val;
        }
      }
    }
    if (binMin > dataMin) {
      binMin = dataMin;
    }
    if (binMax < dataMax) {
      binMax = dataMax;
    }

    /** 
     * If not the above, then set the binMin, binMax to dataMin, dataMax.
     */
    // let [binMin, binMax] = [dataMin, dataMax];

    for (var j = 0; j < noOfBinningMethods; j++) {
      const binningMethod = context.visModel['activeBinningMethodsList'][j];
      let data = [];
      let dataTicks = [];
      // Note: i <= 
      for (var i = 0; i <= context.visModel['binningMethods'][binningMethod]["binBreaks"].length; i++) {
        let obj = {};
        let binID = (i + 1).toString();
        if (i == 0) {
          obj["binMin"] = binMin;
          obj["binMax"] = context.visModel['binningMethods'][binningMethod]["binBreaks"][i];
          // Add first binMin
          if (!isNaN(obj["binMin"])) {
            dataTicks.push(obj["binMin"]);
          }
        }
        else if (i <= context.visModel['binningMethods'][binningMethod]["binBreaks"].length - 1) {
          obj["binMin"] = context.visModel['binningMethods'][binningMethod]["binBreaks"][i - 1];
          obj["binMax"] = context.visModel['binningMethods'][binningMethod]["binBreaks"][i];
        }
        else {
          obj["binMin"] = context.visModel['binningMethods'][binningMethod]["binBreaks"][i - 1];
          obj["binMax"] = binMax;
        }
        obj["binningMethod"] = context.visModel['binningMethods'][binningMethod]["name"];
        obj["binID"] = binID.toString();
        obj["binSize"] = context.visModel['binningMethods'][binningMethod]["binSizes"][binID];

        // Append all binMax
        if (!isNaN(obj["binMax"])) {
          dataTicks.push(obj["binMax"]);
        }
        data.push(obj);
      }

      let compareVISSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "width": width,
        "height": heightOfEachBinningMethodBar,
        "background": null,
        "config": {
          "tick": {
            "bandSize": 20
          },
          "view": { "stroke": null },
          "axis": {
            "domain": false, "grid": false, "ticks": false
          }
        },
        "layer": [{
          "title": null,
          "data": {
            "values": data
          },
          "mark": {
            "type": "bar",
            "tooltip": { "content": "data" }
          },
          "transform": [{
            "filter": "datum.binSize != 0"
          }],
          "encoding": {
            "x": { "field": "binMin", "type": "quantitative", "axis": { "title": null, "values": context.visModel['binningMethods'][binningMethod]["binBreaks"], "format": ".2f", "labelFontSize": 16 }, "scale": { "domain": [binMin, binMax] } },
            "y": {
              "field": "binningMethod", "type": "ordinal", "axis": {
                "title": null,
                "labels": false
              }
            },
            "x2": {
              "field": "binMax", "scale": { "domain": [binMin, binMax] }, "axis": {
                "format": ".2f",
                "labelFontSize": 16
              }
            },
            "size": {
              "field": "binSize",
              "legend": null,
              "scale": {
                "type": "linear",
                "range": [5, heightOfEachBinningMethodBar / 2]
              }
            },
            "color": {
              "field": "binID",
              "type": "quantitative",
              "scale": {
                "domain": data.map(obj => obj["binID"]), // Important, as otherwise the BinIDs are sorted as 1,10,11,..., 2,3,4,5,...
                "scheme": context.getColorScheme(),
                "type": "threshold"
              },
              "legend": null
            }
          }
        },
        {
          "title": null,
          "data": {
            "values": data
          },
          "mark": {
            "type": "rule",
            "tooltip": { "content": "data" }
          },
          "transform": [{
            "filter": "datum.binSize == 0"
          }],
          "encoding": {
            "x": { "field": "binMin", "type": "quantitative", "axis": { "title": null, "values": context.visModel['binningMethods'][binningMethod]["binBreaks"], "format": ".2f" }, "scale": { "domain": [binMin, binMax] } },
            "y": { "field": "binningMethod", "type": "ordinal", "axis": { "title": null, "labelFontSize": 16, "labelLimit": 250, "labelPadding": 10 } },
            "x2": { "field": "binMax", "scale": { "domain": [binMin, binMax] }, "axis": { "format": ".2f" } },
            "size": { "value": 2 },
            "strokeDash": { "value": [8, 8] }
          }
        },
        {
          "title": null,
          "data": {
            "values": dataTicks
          },
          "mark": {
            "type": "tick",
            "tooltip": { "content": "data" },
            "fill": "black",
            "orient": "vertical",
            "thickness": 3,
            "height": heightOfEachBinningMethodBar / 2
          },
          "encoding": {
            "x": { "field": "data", "type": "quantitative", "scale": { "domain": [binMin, binMax] } }
          }
        }
        ]
      }

      // Generate dynamic gradient stops for the Unclassed binning method using the current color scheme
      if (binningMethod == binningMethods.UNCLASSED) {
        delete compareVISSpec["layer"][0]["encoding"]["color"];

        // Use the getBinningMethodScaleObj method to ensure consistent color scheme handling
        const scale = context.getBinningMethodScaleObj(binningMethod);
        const colorScheme = context.visModel['colorScheme'];

        // Generate gradient stops without hex conversion for Unclassed method
        const stops = [];
        for (let i = 0; i < 11; i++) {
          const offset = i / 10;
          let color;

          try {
            const fn = colorScheme["function"];
            if (typeof fn === "function") {
              color = fn(offset);
            } else if (typeof colorScheme["interpolator"] === "function") {
              color = colorScheme["interpolator"](offset);
            } else {
              color = offset < 0.5 ? "#0000ff" : "#ff0000";
            }
          } catch (err) {
            color = offset < 0.5 ? "#0000ff" : "#ff0000";
          }

          stops.push({ offset, color });
        }

        compareVISSpec["layer"][0]["mark"]["color"] = {
          "x1": 0,
          "y1": 0,
          "x2": 1,
          "y2": 0,
          "gradient": "linear",
          "stops": stops
        }
      }

      // Render (or embed) Vega-Lite spec.
      vegaEmbed("#mapContainerCompare-" + binningMethod, compareVISSpec, AppConfig.vegaLiteOptions)
        .then(result => { })
        .catch(console.warn);

    }
  }

  /**
   * Renders the main visualization depending on the active tab.
   */
  renderVIS() {
    let context = this;

    // Depending on the tab, render appropriately.
    if (context.visModel['activeMainTab'] == "explore") {

      // Prepare Visualization
      context.prepareVISSpec();

    } else if (context.visModel['activeMainTab'] == "compare") {

      // Just render the Comparison VIS as the stats are already computed.
      context.renderCompareVIS();

    } else if (context.visModel['activeMainTab'] == "combine") {

      // Prepare VIS for special binning methods.
      context.prepareBaseVISSpec();
      context.prepareSpecialVIS();

      // Render (or embed) Vega-Lite spec.
      vegaEmbed("#specialMapContainerCombine", context.visModel["baseGeoVisSpec"], AppConfig.vegaLiteOptions)
        .then(result => { })
        .catch(console.warn);

      // Prepare resiliency VIS
      context.prepareBaseVISSpec();
      context.prepareResiliencyVIS();

      // Render (or embed) Vega-Lite spec.
      vegaEmbed("#mapContainerCombine", context.visModel["baseGeoVisSpec"], AppConfig.vegaLiteOptions)
        .then(result => { })
        .catch(console.warn);

    } else {
      return;
    }
  }

  /**
   * Initializes or restores manual interval bins for the Create tab.
   * @param reroute Whether to reroute to the Create tab after editing.
   */
  editManualIntervalCreate(reroute = false) {
    let context = this;
    const dct = context.visModel["defaultBinningMethod"];
    const dctObj = context.visModel["binningMethods"][dct];

    if (dctObj && dctObj.savedBins) {
      // Restore saved bins (deep copy)
      context.visModel['bins'] = JSON.parse(JSON.stringify(dctObj.savedBins));

      // Update colors to match current color scheme
      let breaks = context.visModel["binningMethods"][context.visModel["defaultBinningMethod"]]["binBreaks"];
      let binCount = breaks.length + 1;
      Object.keys(context.visModel['bins']).forEach(function (binId, index) {
        if (index < binCount) {
          const offset = index / (binCount - 1);
          const color = UtilsService.generateColor(context.visModel['colorScheme'], offset, binCount);
          context.visModel['bins'][binId]["color"] = color;
        }
      });
    } else {
      context.visModel['bins'] = {}; // Important RESET
      let _bins = {};

      let breaks = context.visModel["binningMethods"][context.visModel["defaultBinningMethod"]]["binBreaks"];
      let binCount = breaks.length + 1;
      let endpoints = [context.visModel['binGuruObj'].min, ...breaks, context.visModel['binGuruObj'].max];
      for (let i = 0; i < binCount; i++) {
        const offset = i / (binCount - 1);
        const color = UtilsService.generateColor(context.visModel['colorScheme'], offset, binCount);
        _bins[i.toString()] = {
          "domain_from": endpoints[i],
          "color": color,
          "domain_to": endpoints[i + 1]
        }
      }
      // Set initial bins
      context.visModel['bins'] = { ..._bins };
    }

    if (reroute) {
      (<any>$('#tabs-main a[href="#tab-create"]')).tab('show');
    }
  }

  /**
   * Handles changes to bin domain values in manual interval editing.
   * @param val The new domain value.
   * @param index The index of the bin being edited.
   */
  onChangeDomain(val, index) {
    let context = this;
    Object.keys(context.visModel['bins']).forEach(function (binIdx) {
      if (binIdx == (index + 1).toString()) {
        context.visModel['bins'][binIdx]["domain_from"] = val;
      }
    });

    // Update colors
    context.updateColorScaleAndMap();
  }

  /**
   * Handles color picker selection for a bin.
   * @param event The color picker event.
   * @param index The index of the bin being edited.
   */
  onColorPickerSelect(event: any, index: number) {
    let context = this;

    // Update Map
    context.updateColorScaleAndMap();
  }

  /**
   * Updates the color scale and map fill colors after bin or color changes.
   * @param checkUnique Whether to enforce unique bins.
   * @param updateFromDomainFrom Whether to update from domain_from values.
   */
  updateColorScaleAndMap(checkUnique = false, updateFromDomainFrom = false) {
    let context = this;

    if (checkUnique) {
      // Only keep unique bins.
      // Also, restart the binId numbering.
      let newBins = {};
      let binIdCounter = 0;
      Object.keys(context.visModel['bins']).forEach(function (binId) {
        if (context.visModel['bins'][binId]['domain_from'] != context.visModel['bins'][binId]['domain_to']) {
          newBins[binIdCounter.toString()] = context.visModel['bins'][binId];
          binIdCounter++;
        }
      });
      context.visModel['bins'] = { ...newBins };
    }

    let range = [];
    let domain = [];
    Object.keys(context.visModel['bins']).forEach(function (binId) {
      // Range should be one less than the domain. No need to include the first domain of -Infinity.
      if (binId != "0") {
        // EPSILON is added or subtracted to ensure that the clicked bin is colored the correct way.
        if (updateFromDomainFrom) {
          domain.push(context.visModel['bins'][binId]["domain_from"] - Number.EPSILON);
        } else {
          domain.push(context.visModel['bins'][binId]["domain_from"] + Number.EPSILON);
        }
      }
      range.push(context.visModel['bins'][binId]["color"]);
    });

    context.visModel['colorScale'] = d3.scaleThreshold<number, string>()
      .domain(domain)
      .range(range);

    // The range is the list of preset colors.
    context.visModel['presetColors'] = [...range];
    // If currentColor is not in the list of presetColors, set it to the first color of presetColors.
    if (range.indexOf(context.visModel['currentColor']) === -1) {
      context.visModel['currentColor'] = range[0];
    }

    // Update the geoshape's fill colors.
    d3.selectAll(".geoshape").style("visibility", function (d: any) {
      let obj = context.visModel['dataMap'].get(d[context.visModel["dataset"]["topoPrimaryKey"]].toString());
      if (obj) {
        const value = obj[context.visModel["dataset"]["feature"]];
        if (value == null || value == undefined || value == "" || Number.isNaN(value) || value == "NA") {
          if (context.visModel["showInvalidValues"] == "off") {
            return "hidden";
          }
        }
      } else {
        if (context.visModel["showInvalidValues"] == "off") {
          return "hidden";
        }
      }
      return "visible";
    }).style("fill", function (d: any) {
      let obj = context.visModel['dataMap'].get(d[context.visModel["dataset"]["topoPrimaryKey"]].toString());
      if (obj) {
        const value = obj[context.visModel["dataset"]["feature"]];
        if (value == null || value == undefined || value == "" || Number.isNaN(value) || value == "NA") {
          return context.visModel["invalidValuesColor"];
        } else {
          return context.visModel['colorScale'](value);
        }
      } else {
        return context.visModel["invalidValuesColor"];
      }
    });

    // The bins assignment above (after making them unique) does not seem to be working; hence, this manual refresh.
    context.cd.detectChanges();
  }

  /**
   * Adds a new bin to the manual interval bins.
   */
  addBin() {
    let context = this;
    let futureIdx = context.objectKeys(context.visModel['bins']).length;
    let prevDomain = context.visModel['bins'][futureIdx - 1]['domain_to'];
    context.visModel['bins'][futureIdx.toString()] = {
      "domain_from": prevDomain,
      "color": "#ffffff",
      "domain_to": prevDomain
    };

    // Update Map
    context.updateColorScaleAndMap();
  }

  /**
   * Updates bins and colors based on user painting interaction.
   * @param value The value to update.
   * @param color The color to assign.
   */
  updateBins(value, color) {

    let context = this;
    let targetBinIdx = context.visModel['presetColors'].indexOf(color);
    let targetBinId = targetBinIdx.toString();
    let binCount = Object.keys(context.visModel['bins']).length;
    let updateFromDomainFrom = false;

    // If target value is greater than any bin's domain_to and the bin's color equals the manually set color
    if (value > context.visModel['bins'][targetBinIdx]['domain_to']) {

      // Modify the targetBinId's domain_to to the new value.
      context.visModel['bins'][targetBinId]['domain_to'] = value;

      // Only consider bin indexes that are greater than the target bin indexes.
      for (var binIdx = targetBinIdx + 1; binIdx < binCount; binIdx++) {
        let binId = binIdx.toString();

        // value must be more than the current bin' domain_from
        if (value > context.visModel['bins'][binId]['domain_from']) {

          // Set the `domain_from` value of this bin as the `domain_to` of the previous bin.
          let prevBinId = (binIdx - 1).toString();
          context.visModel['bins'][binId]['domain_from'] = context.visModel['bins'][prevBinId]['domain_to'];

          // If domain_to is now less than domain_from, that's a problem.
          if (context.visModel['bins'][binId]['domain_from'] >= context.visModel['bins'][binId]['domain_to']) {
            context.visModel['bins'][binId]['domain_to'] = context.visModel['bins'][binId]['domain_from'];

            // Also update this bin's color as both from and to have the same value as the previous bin
            context.visModel['bins'][binId]['color'] = color;
          }
        }
      }

      updateFromDomainFrom = false;
    }
    else if (value < context.visModel['bins'][targetBinIdx]['domain_from']) {

      // Modify the targetBinId's domain_from to the new value.
      context.visModel['bins'][targetBinId]['domain_from'] = value;

      // Only consider bin indexes that are less than the target bin indexes.
      for (var binIdx = targetBinIdx - 1; binIdx >= 0; binIdx--) {
        let binId = binIdx.toString();

        // value must be less than the current bin's domain_to
        if (value < context.visModel['bins'][binId]['domain_to']) {

          // Set the `domain_to` value of this bin as the `domain_from` of the next bin.
          let nextBinId = (binIdx + 1).toString();
          context.visModel['bins'][binId]['domain_to'] = context.visModel['bins'][nextBinId]['domain_from'];

          // If domain_to is now less than domain_from, that's a problem.
          if (context.visModel['bins'][binId]['domain_from'] >= context.visModel['bins'][binId]['domain_to']) {
            context.visModel['bins'][binId]['domain_from'] = context.visModel['bins'][binId]['domain_to'];

            // Also update this bin's color as both from and to have the same value as the previous bin
            context.visModel['bins'][binId]['color'] = color;
          }
        }
      }

      updateFromDomainFrom = true;
    }

    // Update map's colors
    context.updateColorScaleAndMap(true, updateFromDomainFrom);
  }

  /**
   * Handles user interaction with map data (painting, updating bins).
   * @param d The map feature data.
   * @param visContext The visualization context (SVG element).
   */
  processDataInteraction(d, visContext) {
    let context = this;
    let dobj = context.visModel['dataMap'].get(d[context.visModel["dataset"]["topoPrimaryKey"]].toString());
    let value = dobj[context.visModel["dataset"]["feature"]];

    // This will fail if valus is NaN. Handle case when NaNs are implemented.
    if (value == null || value == undefined || value == "" || Number.isNaN(value)) {
      return;
    } else {
      if (context.visModel['paintMode'] == "on" && !context.visModel['dragMode']) {
        d3.select(visContext).raise().style("fill", context.visModel['currentColor']);
        context.updateBins(value, context.visModel['currentColor']);
      }
    }
  }

  /**
   * Renders the interactive map for the Create tab using D3.
   */
  renderMap() {

    let context = this;

    // Start this view with better, default bins selectable from a dropdown.
    context.editManualIntervalCreate(false);

    let width = context.mapContainerCreate.nativeElement.parentNode.offsetWidth;
    let height = context.mapContainerCreate.nativeElement.offsetHeight;

    // The svg
    $("#mapContainerCreate").empty();
    const svg = d3.select("#mapContainerCreate").append("svg");
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");
    var tooltipDiv = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Map and projection
    let projection = null;
    switch (context.visModel["dataset"]["mapProjection"]) {
      case "albersUsa":
        projection = d3.geoAlbersUsa()
        .scale(1050)
        .translate([width / 2, height / 2]);
        break;
      case "mercator":
        projection = d3.geoMercator()
          .center(context.visModel["dataset"]["mapCenter"])
          .scale(1050)
          .translate([width / 2, height / 2]);
        break;
      default:
        // Default to Mercator
        projection = d3.geoMercator()
          .center(context.visModel["dataset"]["mapCenter"])
        break;
    }

    let click = function (event, d) {
      context.visModel['dragMode'] = false; // needed here because mouseUp doesn't work along with zoom()
      context.processDataInteraction(d, this);
    }

    let mouseMove = function (event, d) {
      if (context.visModel['dragMode']) {
        context.processDataInteraction(d, this);
      }
    }

    let mouseDown = function (event, d) {
      context.visModel['dragMode'] = true;
    }

    let mouseUp = function (event, d) {
      context.visModel['dragMode'] = false;
    }

    let mouseOver = function (event, d) {
      let obj = context.visModel['dataMap'].get(d[context.visModel["dataset"]["topoPrimaryKey"]].toString());

      // Tooltip
      let tooltipValue = context.getMapTooltip("d3", obj) as any;

      tooltipDiv.style("opacity", .9);
      tooltipDiv.html(tooltipValue)
        .style("left", (event.pageX + 20) + "px")
        .style("top", (event.pageY - 28) + "px");
      d3.select(this).raise().classed("hovered", true);
    }

    let mouseLeave = function (event, d) {
      tooltipDiv.style("opacity", 0);
      d3.select(this).classed("hovered", false);
    }

    // Draw the map
    g.selectAll("path")
      .data(context.visModel['baseDataFeatureCollection'])
      .enter()
      .append("path")
      .attr("class", "geoshape")
      .attr("d", d3.geoPath().projection(projection))
      .style("stroke", "grey")
      .on("mouseover", mouseOver)
      .on("mouseleave", mouseLeave)
      .on("mousemove", mouseMove)
      .on("mousedown", mouseDown)
      .on("mouseup", mouseUp)
      .on("click", click);

    var zoom = d3.zoom()
      .filter((event) => {
        // Disable pan when mousedown on the geoshape; allow zoom in-out (mousewheel)
        // Todo: Note: for now, the mousedown event allows panning everywhere due to some browser API change.
        if (event.type == "wheel") {
          return true;
        } else if (event.type == "mousedown") {
          return true;
        }
        return true;
      })
      .scaleExtent([0, 10])
      .on('zoom', function (event) {
        g.selectAll('path')
          .attr('transform', event.transform);
      });

    svg.call(zoom);

    // Update map's colors
    context.updateColorScaleAndMap();

    // Update attribute distribution curve
    context.renderAttrDistributionVisSpec();

  }

  /**
   * Initializes the BinGuru object for the current feature.
   */
  initializeBinguruObj() {
    let context = this;
    let data = context.visModel['featureData'][context.visModel["dataset"]["feature"]];

    // Instantiate BinGuru for the current feature
    let binGuruObj = new BinGuru(data, context.visModel['binCount'], context.visModel['binInterval'], 2);
    context.visModel['binInterval'] = +((binGuruObj.max - binGuruObj.min) / 10);
    binGuruObj.binExtent = context.visModel['binInterval'];
    context.visModel['binGuruObj'] = binGuruObj;

    // Update distribution chart and tab
    context.renderAttrDistributionVisSpec();
    context.updateCurrentTab();
  }

  /**
   * Updates the BinGuru object with current bin count and interval.
   */
  updateBinguruObj() {
    let context = this;
    let binGuruObj = context.visModel['binGuruObj'];
    if (binGuruObj) {
      binGuruObj.binCount = context.visModel['binCount'];
      binGuruObj.binExtent = context.visModel['binInterval'];
    }
    // Update distribution chart and tab
    context.renderAttrDistributionVisSpec();
    context.updateCurrentTab();
  }

  /**
   * Loads a sample dataset from files and processes it for visualization.
   */
  loadSampleDataset() {
    let context = this;

    // Clear previous data to avoid accumulation and empty/redundant objects
    context.visModel['featureRawDataWithNaNsJSON'] = [];
    context.visModel['featureRawDataWithNaNs'] = {};
    context.visModel['featureData'] = {};
    context.visModel['featureDataNaNs'] = {};
    context.visModel['dataMap'] = new Map();

    Promise.all([
      d3.json(AppConfig['dataPath'] + context.visModel["dataset"]["geoFile"]),
      d3.csv(AppConfig['dataPath'] + context.visModel["dataset"]["featureFile"], function (d) {
        context.visModel['dataMap'].set(d[context.visModel["dataset"]["primaryKey"]], d);
        return d;
      })]).then(function (dataFromPromise) {

        // So that we don't load the current files again and again if they only have the new feature.
        context.visModel["isDatasetLoaded"] = true;

        let geoTopoData: any = dataFromPromise[0];
        let data = dataFromPromise[1];

        // Set baseData feature collection to be able to `fit` the resultant projected map within the view bounds
        context.visModel['baseDataFeatureCollection'] = topojson.feature(geoTopoData, geoTopoData.objects[context.visModel["dataset"]["topoFeatureRootKey"]])["features"];

        // Store feature data
        data.forEach(function (row) {
          let processedRow = {};
          Object.keys(row).forEach(function (attr) {
            if (!(attr in context.visModel['featureData'])) {
              context.visModel['featureData'][attr] = [];
            }
            if (!(attr in context.visModel['featureDataNaNs'])) {
              context.visModel['featureDataNaNs'][attr] = 0;
            }
            if (!(attr in context.visModel['featureRawDataWithNaNs'])) {
              context.visModel['featureRawDataWithNaNs'][attr] = [];
            }
            let value = parseFloat(row[attr]);
            if (Number.isNaN(value)) {
              context.visModel['featureDataNaNs'][attr]++;
              context.visModel['featureRawDataWithNaNs'][attr].push(row[attr]); // Add everything including NaNs and valid values to this key
            } else {
              context.visModel['featureData'][attr].push(value);
              context.visModel['featureRawDataWithNaNs'][attr].push(value); // Add everything including NaNs and valid values to this key
            }

            if (context.visModel["dataset"]["features"].indexOf(attr) !== -1) {
              processedRow[attr] = Number.isNaN(value) || value == null ? NaN : value; // Can set it to `null` or `NaN`
            } else {
              processedRow[attr] = row[attr];
            }
          });

          // Add everything including NaNs and valid values to this JSON
          context.visModel['featureRawDataWithNaNsJSON'].push(processedRow);
        });
        context.initializeBinguruObj();
      });
  }

  /**
   * Updates the current tab and triggers rendering/statistics as needed.
   */
  updateCurrentTab() {
    let context = this;

    if (!context.visModel["isDatasetLoaded"]) {
      return;
    }

    // First, compute stats
    context.computeStats();

    switch (context.visModel["activeMainTab"]) {
      case "explore":
        setTimeout(function () {
          context.renderVIS();
          context.cd.detectChanges();
        });
        break;

      case "compare":
        setTimeout(function () {
          context.renderVIS();
          context.cd.detectChanges();
        });
        break;

      case "create":
        setTimeout(function () {
          context.setBinningMethodsForResetInCreate();
          context.renderMap();
          context.cd.detectChanges();
        });
        break;

      case "combine":
        setTimeout(function () {
          context.renderVIS();
          context.cd.detectChanges();
        });
        break;

      default:
        break;
    }
  }

  /**
   * Handles input in the geographic search field.
   */
  onGeographicSearchInput() {
    let context = this;
    const searchTerm = context.visModel['geographicSearchTerm'];

    if (!searchTerm || searchTerm.trim() === '') {
      context.visModel['geographicSearchResults'] = [];
      return;
    }

    // Clear previous highlighting
    context.clearGeographicHighlighting();

    // Search through geographic entities
    const results = context.searchGeographicEntities(searchTerm);
    context.visModel['geographicSearchResults'] = results;
  }

  /**
   * Searches for geographic entities matching the search term.
   * @param searchTerm The search term string.
   */
  searchGeographicEntities(searchTerm: string) {
    let context = this;
    const results = [];
    const term = searchTerm.toLowerCase().trim();

    if (!context.visModel['baseDataFeatureCollection'] || !context.visModel['dataMap']) {
      return results;
    }

    // Search through all geographic features
    context.visModel['baseDataFeatureCollection'].forEach((feature: any) => {
      const primaryKey = feature[context.visModel["dataset"]["topoPrimaryKey"]];
      const dataObj = context.visModel['dataMap'].get(primaryKey.toString());

      if (dataObj) {
        // Build a label by concatenating all labelFeatures and the primaryKey
        const labelFeatures = context.visModel["dataset"]["labelFeatures"];
        const labelParts = labelFeatures.map((lf: string) => dataObj[lf]).filter(Boolean);
        // Add primaryKey to the end
        labelParts.push(primaryKey);
        const displayLabel = labelParts.join(", ");

        // Search in the concatenated label string (including primaryKey)
        if (displayLabel.toLowerCase().includes(term)) {
          results.push({
            primaryKey: primaryKey,
            displayLabel: displayLabel,
            feature: feature,
            dataObj: dataObj
          });
        }
      }
    });

    // Limit results to first 10 matches
    return results.slice(0, 10);
  }

  /**
   * Selects a geographic entity from the search results and highlights it.
   * @param result The selected search result object.
   */
  selectGeographicEntity(result: any) {
    let context = this;
    context.visModel['highlightedGeographicEntity'] = result;
    context.visModel['geographicSearchResults'] = [];
    // Set the input field to the concatenated labelFeatures string
    context.visModel['geographicSearchTerm'] = result.displayLabel;
    context.highlightGeographicEntity(result.primaryKey.toString());
  }

  /**
   * Searches and auto-selects the first matching geographic entity.
   */
  searchGeographicEntity() {
    let context = this;
    const searchTerm = context.visModel['geographicSearchTerm'];

    if (!searchTerm || searchTerm.trim() === '') {
      return;
    }

    const results = context.searchGeographicEntities(searchTerm);

    if (results.length > 0) {
      // Auto-select the first result
      context.selectGeographicEntity(results[0]);
    } else {
      // Show no results message
      context.visModel['geographicSearchResults'] = [{
        primaryKey: null,
        label: 'No matches found',
        state: '',
        id: '',
        displayLabel: 'No matches found',
        feature: null,
        dataObj: null
      }];
    }
  }

  /**
   * Highlights a geographic entity on the map by primary key.
   * @param primaryKey The primary key of the entity to highlight.
   */
  highlightGeographicEntity(primaryKey: string) {
    let context = this;

    // Remove previous highlighting
    context.clearGeographicHighlighting();

    // Add highlighting to the selected entity
    d3.selectAll(".geoshape").each(function (d: any) {
      const featurePrimaryKey = d[context.visModel["dataset"]["topoPrimaryKey"]].toString();
      if (featurePrimaryKey === primaryKey) {
        d3.select(this).classed("highlighted", true);
      }
    });
  }

  /**
   * Clears all geographic highlighting from the map.
   */
  clearGeographicHighlighting() {
    let context = this;
    d3.selectAll(".geoshape.highlighted").classed("highlighted", false);
  }

  /**
   * Clears the geographic search input and results.
   */
  clearGeographicSearch() {
    let context = this;
    context.visModel['geographicSearchTerm'] = "";
    context.visModel['geographicSearchResults'] = [];
    context.visModel['highlightedGeographicEntity'] = null;
    context.clearGeographicHighlighting();
  }



  /**
   * Generates histogram bins for the attribute distribution visualization.
   * @returns Array of histogram bin objects.
   */
  generateHistogramBins(): Array<{ bin_start: number, bin_end: number, count: number }> {
    let context = this;

    // Check if we have valid data
    if (!context.visModel['binGuruObj'] || !context.visModel['binGuruObj'].data) {
      return [];
    }

    const data = context.visModel['binGuruObj'].data;
    const binCount = context.visModel['binCount'];

    // Use D3's histogram function to create bins
    const histogram = d3.bin()
      .domain(d3.extent(data) as [number, number])
      .thresholds(binCount);

    const bins = histogram(data);

    // Convert D3 bins to the format expected by Vega-Lite
    const histogramBins = bins.map(bin => ({
      bin_start: bin.x0 || 0,
      bin_end: bin.x1 || 0,
      count: bin.length
    }));

    return histogramBins;
  }

  /**
   * Opens the share modal for a given binning method.
   * @param dct_id The binning method identifier.
   */
  openShareModal(dct_id) {
    let context = this;
    this.dialogService.open(ShareModalComponent, {
      header: 'Share Binning Method - ' + context.visModel['binningMethods'][dct_id]['name'],
      width: '60%',
      height: '70%',
      modal: true,
      closeOnEscape: false,
      dismissableMask: false,
      data: {
        binningMethodObj: context.visModel['binningMethods'][dct_id],
        dct_id: dct_id
      }
    });
  }

  /**
   * Registers custom event listeners for tab changes and UI events.
   */
  registerCustomEventListeners() {
    let context = this;
    // Register event listener for the tabs
    $('#tabs-main a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      context.visModel['activeMainTab'] = $(e.target).attr("id");
      context.updateCurrentTab();
    });
  }

  /**
   * Angular OnInit lifecycle hook (not used).
   */
  ngOnInit(): void {}

  /**
   * Angular AfterViewInit lifecycle hook. Registers event listeners.
   */
  ngAfterViewInit(): void {
    let context = this;

    // Register event listeners
    context.registerCustomEventListeners();
  }

  /**
   * Angular OnDestroy lifecycle hook (not used).
   */
  ngOnDestroy(): void { }
}