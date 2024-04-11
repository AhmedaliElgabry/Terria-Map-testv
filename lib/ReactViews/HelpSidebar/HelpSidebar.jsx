import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import ObserveModelMixin from "../ObserveModelMixin";
import Icon from "../Icon.jsx";
import classNames from "classnames";
import triggerResize from "../../Core/triggerResize";
import Loader from "../Loader";
import Styles from "./help-sidebar.scss";
import { withTranslation } from "react-i18next";
import measureElement from "../measureElement";
import AccordionStyle from "../ComponentStyles/accordion.scss";
import loadJson from "../../Core/loadJson";

const HelpSidebar = createReactClass({
  displayName: "HelpSidebar",
  mixins: [ObserveModelMixin],
  propTypes: {
    terria: PropTypes.object.isRequired,
    isVisible: PropTypes.bool,
    viewState: PropTypes.object.isRequired,
    animationDuration: PropTypes.number,
    widthFromMeasureElementHOC: PropTypes.number,
    t: PropTypes.func.isRequired
  },

  getInitialState() {
    return {
      showVideoGuide: false, // for whether to actually render `renderVideoPlayer()`
      videoGuideVisible: false, // for animating
      showPopup: false, // for removing
      videoId: null,
      helpContent: []
    };
  },
  componentDidMount() {
    if (this.props.terria.configParameters.helpResource) {
      loadJson(this.props.terria.configParameters.helpResource).then(data =>
        this.setState({
          helpContent: data || []
        })
      );
    }
  },
  getVideoId(videoUrl) {
    if (!videoUrl) return "";
    const match = videoUrl.match(/(?<=v=)[^&?]+/);

    if (match) {
      return match[0];
    } else {
      return "";
    }
  },
  togglePopup() {
    this.setState({
      showPopup: !this.state.showPopup
    });
  },

  closePopup() {
    this.setState({
      showPopup: false
    });
  },
  showVideo(videoId, show = true) {
    const showVideoGuide = this.state.showVideoGuide;
    // If not enabled
    if (!showVideoGuide) {
      this.setState({
        showVideoGuide: show,
        videoId: videoId,
        videoGuideVisible: true
      });
    }
    // Otherwise we immediately trigger exit animations, then close it 300ms later
    if (showVideoGuide) {
      this.slideOutTimer = this.setState({
        videoGuideVisible: false
      });
      setTimeout(() => {
        this.setState({
          showVideoGuide: !showVideoGuide
        });
      }, 300);
    }
  },
  renderWelcome(videoUrl) {
    const videoId = this.getVideoId(videoUrl);

    return (
      <div className={Styles.welcomeVideoThumbnail}>
        <button
          title={this.props.t("helpSidebar.watch")}
          onClick={() => {
            this.showVideo(videoId);
          }}
          style={{
            backgroundImage: `url('https://img.youtube.com/vi/${videoId}/0.jpg')`,
            backgroundSize: "cover"
          }}
        >
          <Icon glyph={Icon.GLYPHS.play} />
        </button>
      </div>
    );
  },

  renderVideoPlayer() {
    const { videoId } = this.state;
    return (
      <div
        className={classNames({
          [Styles.videoGuideWrapper]: true,
          [Styles.videoGuideWrapperClosing]: !this.state.videoGuideVisible
        })}
        onClick={() => this.showVideo(null, false)}
      >
        <div
          className={Styles.videoGuide}
          onClick={e => e.stopPropagation()}
          style={{
            backgroundImage: `url('https://img.youtube.com/vi/${videoId}/0.jpg')`
          }}
        >
          <div className={Styles.videoGuideRatio}>
            <div className={Styles.videoGuideLoading}>
              <Loader message={` `} />
            </div>
            <iframe
              className={Styles.videoGuideIframe}
              src={`https://www.youtube.com/embed/${videoId}`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen;"
            />
          </div>
        </div>
      </div>
    );
  },

  hideSidebar() {
    this.props.viewState.helpSidebarShown = !this.props.viewState
      .helpSidebarShown;
    this.props.terria.currentViewer.notifyRepaintRequired();
    // Allow any animations to finish, then trigger a resize.
    setTimeout(function() {
      triggerResize();
    }, this.props.animationDuration || 1);
    this.setState({ videoId: null, showVideoGuide: false });
  },
  saveTopicsCovered(content, entry) {
    const terria = this.props.terria;
    const topicsCovered =
      JSON.parse(terria.getLocalProperty("topicsCovered")) || {};
    terria.setLocalProperty(
      "topicsCovered",
      JSON.stringify({
        ...topicsCovered,
        [content.name + "_" + entry.title]: true
      })
    );
  },

  renderEntry(content, entry, idx) {
    const videoId = this.getVideoId(entry.video);
    const terria = this.props.terria;
    const topicsCovered =
      JSON.parse(terria.getLocalProperty("topicsCovered")) || {};

    return (
      <div
        key={"entry_" + idx}
        className={classNames(Styles.helpEntry, {
          [Styles.visitedTopic]: topicsCovered[content.name + "_" + entry.title]
        })}
      >
        <h1>{idx + 1}</h1>
        <div className={Styles.videoPlayerThumbnail}>
          {entry.video && (
            <button
              title={this.props.t("helpSidebar.watch")}
              onClick={() => {
                this.showVideo(videoId);
                this.saveTopicsCovered(content, entry);
              }}
              style={{
                backgroundImage: `url('https://img.youtube.com/vi/${videoId}/0.jpg')`
              }}
            >
              <Icon glyph={Icon.GLYPHS.play} />
            </button>
          )}
        </div>

        {!entry.document && (
          <p
            onClick={() => {
              this.showVideo(videoId);
              this.saveTopicsCovered(content, entry);
            }}
            style={{ marginLeft: "5px" }}
          >
            {entry.title}
          </p>
        )}

        {entry.document && (
          <a
            style={{ marginLeft: "5px" }}
            href={entry.document}
            onClick={() => this.saveTopicsCovered(content, entry)}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon glyph={Icon.GLYPHS.externalLink} /> {entry.title}
          </a>
        )}
      </div>
    );
  },
  render() {
    const {
      t,
      terria: {
        appName,
        configParameters: { welcomeBanner, aboutUrl }
      }
    } = this.props;
    const { helpContent } = this.state;
    const { setIsOpen, isTourLoading } = this.props.viewState.tourControl ?? {};

    const { videoUrl, readMoreUrl, tourUrl: guidedTourUrl } =
      welcomeBanner || {};

    const openedIcon = (
      <span className={Styles.iconOpen}>
        <Icon glyph={Icon.GLYPHS.opened} />
      </span>
    );

    const className = classNames({
      [Styles.helpSidebar]: true,
      [Styles.isVisible]: this.props.isVisible,
      [Styles.isHidden]: !this.props.isVisible
    });

    return (
      <div id="helpSidebar" className={className}>
        {this.state.showVideoGuide && this.renderVideoPlayer()}

        <ul className={Styles.helpTitle}>
          <li className={Styles.appName} title={appName} key={1}>
            {appName} Help
          </li>
          <li key={2}>
            <button
              type="button"
              aria-label={t("helpSidebar.hide")}
              onClick={this.hideSidebar}
              className={Styles.hideButton}
              title={t("helpSidebar.hide")}
            >
              <Icon glyph={Icon.GLYPHS.right} />
            </button>
          </li>
        </ul>

        <header>
          <div className={Styles.bannerContent}>
            {videoUrl && this.renderWelcome(videoUrl)}

            {guidedTourUrl && isTourLoading == false && (
              <button
                type="button"
                className={classNames(Styles.btnTour, Styles.btnAction)}
                onClick={() => {
                  setIsOpen(true);
                }}
              >
                <Icon glyph={Icon.GLYPHS.tour} />
                <span>{t("helpSidebar.tour")}</span>
              </button>
            )}

            <button
              type="button"
              className={classNames(Styles.btnAction, Styles.btnExplore)}
              onClick={() => {
                this.props.viewState.topElement = "AddData";
                this.props.viewState.openAddData();
                this.hideSidebar();
              }}
            >
              <Icon glyph={Icon.GLYPHS.add} />
              <span>{t("helpSidebar.explore")}</span>
            </button>

            {(readMoreUrl || aboutUrl) && (
              <a
                href={readMoreUrl || aboutUrl}
                rel={"noreferrer"}
                target={"_blank"}
                className={classNames(Styles.btnAction, Styles.btnReadMore)}
              >
                <Icon glyph={Icon.GLYPHS.externalLink} />
                <span>{t("helpSidebar.read")}</span>
              </a>
            )}
          </div>
        </header>

        <div id="helpsidebarAccordion" className={AccordionStyle.accordion}>
          {helpContent.map((content, idx) => {
            return (
              <>
                <input
                  key={idx}
                  type="radio"
                  name="helpSidebarAccordion"
                  defaultChecked={idx == 0}
                  className={AccordionStyle.accordionSelect}
                />

                <div
                  key={"title" + idx}
                  className={AccordionStyle.accordionTitle}
                >
                  <span>
                    {openedIcon} {content.name}
                  </span>
                </div>
                <div
                  key={"body" + idx}
                  style={{ overflow: "unset", padding: 0 }}
                  className={AccordionStyle.accordionContentXl}
                >
                  {content.entries.map((entry, idx) => {
                    return this.renderEntry(content, entry, idx);
                  })}
                </div>
              </>
            );
          })}
        </div>

        <div className={Styles.footerWrapper}>
          <a href="/changelog.html" target="_blank">
            <span>{t("helpSidebar.changelog")}</span>
            <Icon glyph={Icon.GLYPHS.externalLink} />
          </a>
        </div>
      </div>
    );
  }
});

export default withTranslation()(measureElement(HelpSidebar));
