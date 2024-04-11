import React from "react";
import VectorFeatureMaskProvider from "../../../Models/VectorFeatureMaskProvider";
import AsyncSelect from "react-select/async";
import loadJson from "../../../Core/loadJson";
import proxyCatalogItemUrl from "../../../Models/proxyCatalogItemUrl";
import colorStyles from "./ReactSelectorOptions";
import DimensionStyle from "./dimension-selector-section.scss";
import Styles from "./attribute-search.scss";
import Rectangle from "terriajs-cesium/Source/Core/Rectangle";
import Icon from "../../Icon";
import WfsFeatureSearch from "./WfsFeatureSearch";
import knockout from "terriajs-cesium/Source/ThirdParty/knockout-3.5.1";

export default class AttributeSearch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchableAttributes: [],
      searchAttribute: "",
      changeFilterAttribute: false
    };
  }

  async componentDidMount() {
    const { item } = this.props;

    if (item.type != "mvt" || !item.allowMasking) {
      return;
    }

    this.maskProvider = new VectorFeatureMaskProvider(item.terria, item);
    this.featureSearchProvider = new WfsFeatureSearch(item);

    const searchableAttributes = await this.featureSearchProvider.fetchLayerAttributes();

    const defaultSearchAttribute =
      searchableAttributes.find(a => a.default) ||
      searchableAttributes.find(a => a.name.includes("name")) ||
      searchableAttributes?.[0];

    this.props.terria.onMaskChange = knockout.observable("maskChanged");

    // Focus event can be triggered from the url or from the feature info popup
    // we should track those and try to display a name for the selected attribute
    this.props.terria.onMaskChange.subscribe(feature => {
      if (!feature) {
        this.setState({ feature: null });
        return;
      }

      if (!this.state.feature) {
        this.setState({
          feature: { ...feature, label: <label>{feature.text}</label> }
        });
        return;
      }

      if (this.state.feature.text != feature.text)
        this.setState({
          feature: { ...feature, label: <label>{feature.text}</label> }
        });
    });

    this.setState({
      searchableAttributes: searchableAttributes,
      searchAttribute: defaultSearchAttribute,
      changeFilterAttribute: !defaultSearchAttribute
    });
  }

  async onFeatureSelected(feature) {
    this.setState({ feature: feature });

    if (!feature) {
      this.maskProvider.remove();
      return;
    }

    const { bbox } = feature;
    const bboxRectangle = Rectangle.fromDegrees(
      bbox[0],
      bbox[1],
      bbox[2],
      bbox[3]
    );
    await this.maskProvider.mask(
      this.state.searchAttribute.name, // key
      feature.text, // value
      bboxRectangle
    );
  }

  async featureSearch(search, callback) {
    if (!search || !search.length) return [];

    const features = await this.featureSearchProvider.searchFeatures(
      this.state.searchAttribute,
      search
    );
    const searchAttribute = this.state.searchAttribute.name;

    const options = features.map(a => ({
      text: a.properties?.[searchAttribute],
      value: a.properties?.[searchAttribute],
      bbox: a.bbox,
      label: <label>{a.properties?.[searchAttribute]}</label>
    }));

    return callback(options);
  }
  debounce(func, wait = 500) {
    let timeout = null;

    return function executablePath(...args) {
      let run = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(run, wait);
    };
  }
  render() {
    const item = this.props.item;
    if (item.type != "mvt" || !item.allowMasking) {
      return null;
    }

    if (
      !this.state.searchableAttributes ||
      !this.state.searchableAttributes.length
    ) {
      // console.warn(`Unable to fetch searchable attributes for ${item.name}`);
      return null;
    }

    const debouncedSearch = this.debounce(this.featureSearch.bind(this));

    return (
      <>
        {!this.state.changeFilterAttribute && (
          <div className={Styles.showSelectedFilter}>
            <small>
              Search by{" "}
              <span>
                {this.state.searchAttribute.text ||
                  this.state.searchAttribute.name}
              </span>
            </small>
            <small>
              <button
                onClick={() => this.setState({ changeFilterAttribute: true })}
              >
                Change
              </button>
            </small>
          </div>
        )}

        {this.state.changeFilterAttribute && (
          <fieldset className={Styles.changeSelectedFilter}>
            <legend>
              {" "}
              <Icon glyph={Icon.GLYPHS.search} /> <small> Search by</small>
            </legend>

            {this.state.searchableAttributes?.map((attribute, i) => (
              <label key={i}>
                <input
                  name={(item.id || item.name) + "-attribs"}
                  type="radio"
                  value={attribute}
                  checked={attribute == this.state.searchAttribute}
                  onClick={() =>
                    this.setState({
                      searchAttribute: attribute,
                      changeFilterAttribute: false
                    })
                  }
                />
                {attribute.text || attribute.name}
              </label>
            ))}
          </fieldset>
        )}

        <AsyncSelect
          id="attribute-search"
          cacheOptions
          loadOptions={debouncedSearch}
          value={this.state.feature}
          defaultOptions={[]}
          className={DimensionStyle.dropdown}
          defaultMenuIsOpen={false}
          placeholder={`Type to search by ${this.state.searchAttribute.text ||
            this.state.searchAttribute.name}`}
          onChange={this.onFeatureSelected.bind(this)}
          styles={colorStyles}
          isClearable={true}
          isDisabled={!this.state.searchAttribute}
        />
      </>
    );
  }
}
