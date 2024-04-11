"use strict";

import React from "react";
import PropTypes from "prop-types";
import createReactClass from "create-react-class";

import { withTranslation } from "react-i18next";

import classNames from "classnames";

import ObserveModelMixin from "../../../ObserveModelMixin";
import PrintingService from "../../../../Printing/PrintingService";

import Loader from "../../../Loader";
import Icon from "../../../Icon.jsx";
import tabStyles from "./print-using-template-view.scss";
import styles from "./print-view.scss";
import loadJson from "../../../../Core/loadJson";

/**
 * Creates a new printable view.
 *
 * @param {Terria} options.terria The Terria instance.
 * @param {options} options .
 * @param {Function} [options.readyCallback] A function that is called when the print view is ready to be used. The function is
 *                   given the print view window as its only parameter.
 * @param {Function} [options.closeCallback] A function that is called when the print view is closed. The function is given
 *                   the print view window as its only parameter.
 */

const PrintUsingTemplateView = createReactClass({
  displayName: "PrintView",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object,
    options: PropTypes.object,
    closeCallback: PropTypes.func,
    readyCallback: PropTypes.func,
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      printTemplates: [],
      isLoading: true,
      isPrinting: false
    };
  },

  componentDidMount() {
    const {
      terria: {
        configParameters: { printConfigUrl }
      }
    } = this.props;

    const isPrintconfigUrlDefined =
      !printConfigUrl || typeof printConfigUrl === "undefined";

    if (isPrintconfigUrlDefined) {
      this.setState({
        printTemplates: null,
        isLoading: false
      });
    } else {
      this.setState({ isLoading: true });
      loadJson(printConfigUrl).then(resp => {
        this.setState({
          printTemplates: resp.templates,
          isLoading: false
        });
      });
    }
  },

  onTemplateSelected(options, template) {
    const { shareUrl } = options;
    const { terria, closeCallback } = this.props;

    this.setState({
      isPrinting: true
    });

    new PrintingService()
      .print(terria, template, shareUrl)
      .then(() => {
        this.setState({
          isPrinting: false
        });
        closeCallback();
      })
      .catch(err => {
        this.setState({
          isPrinting: false
        });
        closeCallback();
        console.error(err);
        throw new Error(err);
      });
  },

  render() {
    const { options, readyCallback, t } = this.props;
    const { printTemplates, isLoading, isPrinting } = this.state;

    this.ref = React.createRef();

    return (
      <div
        className={classNames(tabStyles.modalWrapper, "top-element")}
        id="print-panel-wrapper"
      >
        <div
          onClick={readyCallback}
          id="modal-overlay"
          className={tabStyles.modalOverlay}
          tabIndex="-1"
        />
        <div
          id="print-panel"
          className={classNames(
            tabStyles.explorerPanel,
            styles.explorerPanelOverrides,
            tabStyles.modalContent,
            {
              [tabStyles.isMounted]: true //this.state.slidIn
            }
          )}
          aria-labelledby="modalTitle"
          aria-describedby="modalDescription"
          role="dialog"
        >
          <button
            type="button"
            onClick={readyCallback}
            className={tabStyles.btnCloseModal}
            title={"Close"}
            data-target="close-modal"
          >
            x
          </button>
          <div className={tabStyles.navBar}>
            <label>{t("customPrintWindow.selectTemplate")}</label>
          </div>

          <div className={tabStyles.inputsContainer}>
            <Choose>
              <When
                condition={
                  printTemplates && printTemplates.length > 0 && !isLoading
                }
              >
                <div className={styles.templateViewWrapper} disabled>
                  {printTemplates.map(template => {
                    return (
                      <div
                        key={template.name}
                        className={classNames(
                          styles.template,
                          isPrinting ? styles.preventClick : ""
                        )}
                      >
                        <h5>{template.name}</h5>
                        <div className={styles.preview}>
                          <img
                            className={styles.thumbnail}
                            src={template.thumbnail}
                            alt={template.name}
                            onClick={() =>
                              this.onTemplateSelected(options, template.config)
                            }
                          />
                          <div className={styles.previewText}>
                            {t("customPrintWindow.preview")}
                          </div>
                        </div>
                        <p className={styles.description}>
                          <Icon
                            className={styles.icon}
                            glyph={Icon.GLYPHS.bulb}
                          />
                          <span className={styles.text}>
                            {template.description}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </When>

              <When
                condition={
                  (!printTemplates || printTemplates.length <= 0) && isLoading
                }
              >
                <Loader
                  message={t("customPrintWindow.loadingTemplates")}
                  className={styles.loader}
                />
              </When>

              <When
                condition={
                  (!printTemplates || printTemplates.length <= 0) && !isLoading
                }
              >
                <p>{t("customPrintWindow.noTemplate")}</p>
                <p>No Print Template Found</p>
              </When>
            </Choose>
            <If condition={!isLoading && isPrinting}>
              <Loader
                message={t("customPrintWindow.printing")}
                className={styles.loader}
              />
            </If>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = withTranslation()(PrintUsingTemplateView);
