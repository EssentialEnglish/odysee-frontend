// @flow
import { SHOW_ADS, DOMAIN, SIMPLE_SITE, ENABLE_NO_SOURCE_CLAIMS } from 'config';
import * as ICONS from 'constants/icons';
import * as PAGES from 'constants/pages';
import * as CS from 'constants/claim_search';
import React, { useState, useRef } from 'react';
import Page from 'component/page';
import ClaimListDiscover from 'component/claimListDiscover';
import Button from 'component/button';
import useHover from 'effects/use-hover';
import { useIsMobile, useIsLargeScreen } from 'effects/use-screensize';
import usePersistedState from 'effects/use-persisted-state';
import analytics from 'analytics';
import HiddenNsfw from 'component/common/hidden-nsfw';
import Icon from 'component/common/icon';
import Ads from 'web/component/ads';
import LbcSymbol from 'component/common/lbc-symbol';
import I18nMessage from 'component/i18nMessage';
import moment from 'moment';
import { getLivestreamUris } from 'util/livestream';

const DEFAULT_LIVESTREAM_TILE_LIMIT = 8;

const SECTION = {
  HIDDEN: 0,
  LESS: 1,
  MORE: 2,
};

type Props = {
  dynamicRouteProps: RowDataItem,
  // --- redux ---
  location: { search: string },
  followedTags: Array<Tag>,
  repostedUri: string,
  repostedClaim: ?GenericClaim,
  doToggleTagFollowDesktop: (string) => void,
  doResolveUri: (string) => void,
  isAuthenticated: boolean,
  tileLayout: boolean,
  activeLivestreams: ?LivestreamInfo,
  doFetchActiveLivestreams: (orderBy?: Array<string>) => void,
};

function DiscoverPage(props: Props) {
  const {
    location: { search },
    followedTags,
    repostedClaim,
    repostedUri,
    doToggleTagFollowDesktop,
    doResolveUri,
    isAuthenticated,
    tileLayout,
    activeLivestreams,
    doFetchActiveLivestreams,
    dynamicRouteProps,
  } = props;

  const [liveSectionStore, setLiveSectionStore] = usePersistedState('discover:liveSection', SECTION.LESS);

  const buttonRef = useRef();
  const isHovering = useHover(buttonRef);
  const isMobile = useIsMobile();
  const isLargeScreen = useIsLargeScreen();

  const urlParams = new URLSearchParams(search);
  const claimType = urlParams.get('claim_type');
  const tagsQuery = urlParams.get('t') || null;
  const tags = tagsQuery ? tagsQuery.split(',') : null;
  const repostedClaimIsResolved = repostedUri && repostedClaim;

  const discoverIcon = SIMPLE_SITE ? ICONS.WILD_WEST : ICONS.DISCOVER;
  const discoverLabel = SIMPLE_SITE ? __('Wild West') : __('All Content');
  // Eventually allow more than one tag on this page
  // Restricting to one to make follow/unfollow simpler
  const tag = (tags && tags[0]) || null;
  const channelIds =
    (dynamicRouteProps && dynamicRouteProps.options && dynamicRouteProps.options.channelIds) || undefined;

  const isFollowing = followedTags.map(({ name }) => name).includes(tag);
  let label = isFollowing ? __('Following --[button label indicating a channel has been followed]--') : __('Follow');
  if (isHovering && isFollowing) {
    label = __('Unfollow');
  }

  const initialLiveTileLimit = getPageSize(DEFAULT_LIVESTREAM_TILE_LIMIT);

  const includeLivestreams = !tagsQuery;
  const [liveSection, setLiveSection] = useState(includeLivestreams ? liveSectionStore : SECTION.HIDDEN);
  const livestreamUris = includeLivestreams && getLivestreamUris(activeLivestreams, channelIds);
  const liveTilesOverLimit = livestreamUris && livestreamUris.length > initialLiveTileLimit;
  const useDualList = liveSection === SECTION.LESS && liveTilesOverLimit;

  function getMeta() {
    if (liveSection === SECTION.MORE && liveTilesOverLimit) {
      return (
        <Button
          label={__('Show less livestreams')}
          button="link"
          iconRight={ICONS.UP}
          className="claim-grid__title--secondary"
          onClick={() => setLiveSection(SECTION.LESS)}
        />
      );
    }

    return !dynamicRouteProps ? (
      <a
        className="help"
        href="https://odysee.com/@OdyseeHelp:b/trending:50"
        title={__('Learn more about Credits on %DOMAIN%', { DOMAIN })}
      >
        <I18nMessage tokens={{ lbc: <LbcSymbol /> }}>Results boosted by %lbc%</I18nMessage>
      </a>
    ) : (
      tag && !isMobile && (
        <Button
          ref={buttonRef}
          button="alt"
          icon={ICONS.SUBSCRIBE}
          iconColor="red"
          onClick={handleFollowClick}
          requiresAuth={IS_WEB}
          label={label}
        />
      )
    );
  }

  function getPageSize(originalSize) {
    return isLargeScreen ? originalSize * (3 / 2) : originalSize;
  }

  function getPins(routeProps) {
    if (routeProps && routeProps.pinnedUrls) {
      return {
        urls: routeProps.pinnedUrls,
        onlyPinForOrder: CS.ORDER_BY_TRENDING,
      };
    }
  }

  React.useEffect(() => {
    if (repostedUri && !repostedClaimIsResolved) {
      doResolveUri(repostedUri);
    }
  }, [repostedUri, repostedClaimIsResolved, doResolveUri]);

  function handleFollowClick() {
    if (tag) {
      doToggleTagFollowDesktop(tag);

      const nowFollowing = !isFollowing;
      analytics.tagFollowEvent(tag, nowFollowing, 'tag-page');
    }
  }

  let headerLabel;
  if (repostedClaim) {
    headerLabel = __('Reposts of %uri%', { uri: repostedUri });
  } else if (tag) {
    headerLabel = (
      <span>
        <Icon icon={ICONS.TAG} size={10} />
        {(tag === CS.TAGS_ALL && __('All Content')) || (tag === CS.TAGS_FOLLOWED && __('Followed Tags')) || tag}

        <Button
          className="claim-search__tags-link"
          button="link"
          label={__('Manage Tags')}
          navigate={`/$/${PAGES.TAGS_FOLLOWING_MANAGE}`}
        />
      </span>
    );
  } else {
    headerLabel = (
      <span>
        <Icon icon={(dynamicRouteProps && dynamicRouteProps.icon) || discoverIcon} size={10} />
        {(dynamicRouteProps && __(`${dynamicRouteProps.title}`)) || discoverLabel}
      </span>
    );
  }

  // returns true if passed element is fully visible on screen
  function isScrolledIntoView(el) {
    const rect = el.getBoundingClientRect();
    const elemTop = rect.top;
    const elemBottom = rect.bottom;

    // Only completely visible elements return true:
    const isVisible = elemTop >= 0 && elemBottom <= window.innerHeight;
    return isVisible;
  }

  React.useEffect(() => {
    if (isAuthenticated || !SHOW_ADS || window.location.pathname === `/$/${PAGES.WILD_WEST}`) {
      return;
    }

    (async function () {
      // test if adblock is enabled
      let adBlockEnabled = false;
      const googleAdUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      try {
        await fetch(new Request(googleAdUrl)).catch((_) => {
          adBlockEnabled = true;
        });
      } catch (e) {
        adBlockEnabled = true;
      } finally {
        if (!adBlockEnabled) {
          // select the cards on page
          let cards = document.getElementsByClassName('card claim-preview--tile');

          // eslint-disable-next-line no-inner-declarations
          function checkFlag() {
            if (cards.length === 0) {
              window.setTimeout(checkFlag, 100);
            } else {
              // find the last fully visible card
              let lastCard;

              // width of browser window
              const windowWidth = window.innerWidth;

              // on small screens, grab the second item
              if (windowWidth <= 900) {
                lastCard = cards[1];
              } else {
                // otherwise, get the last fully visible card
                for (const card of cards) {
                  const isFullyVisible = isScrolledIntoView(card);
                  if (!isFullyVisible) break;
                  lastCard = card;
                }
              }

              // clone the last card
              // $FlowFixMe
              const clonedCard = lastCard.cloneNode(true);

              // insert cloned card
              // $FlowFixMe
              lastCard.parentNode.insertBefore(clonedCard, lastCard);

              // delete last card so that it doesn't mess up formatting
              // $FlowFixMe
              // lastCard.remove();

              // change the appearance of the cloned card
              // $FlowFixMe
              clonedCard.querySelector('.claim__menu-button').remove();

              // $FlowFixMe
              clonedCard.querySelector('.truncated-text').innerHTML = __(
                'Hate these? Login to Odysee for an ad free experience'
              );

              // $FlowFixMe
              clonedCard.querySelector('.claim-tile__info').remove();

              // $FlowFixMe
              clonedCard.querySelector('[role="none"]').removeAttribute('href');

              // $FlowFixMe
              clonedCard.querySelector('.claim-tile__header').firstChild.href = '/$/signin';

              // $FlowFixMe
              clonedCard.querySelector('.claim-tile__title').firstChild.removeAttribute('aria-label');

              // $FlowFixMe
              clonedCard.querySelector('.claim-tile__title').firstChild.removeAttribute('title');

              // $FlowFixMe
              clonedCard.querySelector('.claim-tile__header').firstChild.removeAttribute('aria-label');

              // $FlowFixMe
              clonedCard
                .querySelector('.media__thumb')
                .replaceWith(document.getElementsByClassName('homepageAdContainer')[0]);

              // show the homepage ad which is not displayed at first
              document.getElementsByClassName('homepageAdContainer')[0].style.display = 'block';

              // $FlowFixMe
              const imageHeight = window.getComputedStyle(lastCard.querySelector('.media__thumb')).height;
              // $FlowFixMe
              const imageWidth = window.getComputedStyle(lastCard.querySelector('.media__thumb')).width;

              const styles = `#av-container, #AVcontent, #aniBox {
                height: ${imageHeight} !important;
                width: ${imageWidth} !important;
              }`;

              const styleSheet = document.createElement('style');
              styleSheet.type = 'text/css';
              styleSheet.id = 'customAniviewStyling';
              styleSheet.innerText = styles;
              // $FlowFixMe
              document.head.appendChild(styleSheet);

              window.dispatchEvent(new CustomEvent('scroll'));
            }
          }
          checkFlag();
        }
      }
    })();
  }, [isAuthenticated]);

  // Sync liveSection --> liveSectionStore
  React.useEffect(() => {
    if (liveSection !== SECTION.HIDDEN && liveSection !== liveSectionStore) {
      setLiveSectionStore(liveSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSection]);

  // Fetch active livestreams on mount
  React.useEffect(() => {
    if (liveSection === SECTION.LESS) {
      doFetchActiveLivestreams(CS.ORDER_BY_TRENDING_VALUE);
    } else {
      doFetchActiveLivestreams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps, (on mount only)
  }, []);

  return (
    <Page noFooter fullWidthPage={tileLayout}>
      {useDualList && (
        <>
          <ClaimListDiscover
            uris={livestreamUris && livestreamUris.slice(0, initialLiveTileLimit)}
            headerLabel={headerLabel}
            header={repostedUri ? <span /> : undefined}
            tileLayout={repostedUri ? false : tileLayout}
            hideAdvancedFilter
            hideFilters
            infiniteScroll={false}
            loading={false}
            showNoSourceClaims={ENABLE_NO_SOURCE_CLAIMS}
            meta={getMeta()}
          />
          <div className="livestream-list--view-more">
            <Button
              label={__('Show more livestreams')}
              button="link"
              iconRight={ICONS.DOWN}
              className="claim-grid__title--secondary"
              onClick={() => {
                doFetchActiveLivestreams();
                setLiveSection(SECTION.MORE);
              }}
            />
          </div>
        </>
      )}

      <Ads type="homepage" />

      <ClaimListDiscover
        prefixUris={useDualList ? undefined : livestreamUris}
        pins={useDualList ? undefined : getPins(dynamicRouteProps)}
        hideAdvancedFilter={SIMPLE_SITE}
        hideFilters={SIMPLE_SITE ? !dynamicRouteProps : undefined}
        header={useDualList ? <span /> : repostedUri ? <span /> : undefined}
        tileLayout={repostedUri ? false : tileLayout}
        defaultOrderBy={SIMPLE_SITE ? (dynamicRouteProps ? undefined : CS.ORDER_BY_TRENDING) : undefined}
        claimType={claimType ? [claimType] : undefined}
        headerLabel={!useDualList && headerLabel}
        tags={tags}
        hiddenNsfwMessage={<HiddenNsfw type="page" />}
        repostedClaimId={repostedClaim ? repostedClaim.claim_id : null}
        injectedItem={
          SHOW_ADS && IS_WEB ? (SIMPLE_SITE ? false : !isAuthenticated && <Ads small type={'video'} />) : false
        }
        // Assume wild west page if no dynamicRouteProps
        // Not a very good solution, but just doing it for now
        // until we are sure this page will stay around
        // TODO: find a better way to determine discover / wild west vs other modes release times
        // for now including && !tags so that
        releaseTime={
          SIMPLE_SITE
            ? !dynamicRouteProps && !tags && `>${Math.floor(moment().subtract(1, 'day').startOf('week').unix())}`
            : undefined
        }
        feeAmount={SIMPLE_SITE ? !dynamicRouteProps && CS.FEE_AMOUNT_ANY : undefined}
        channelIds={channelIds}
        limitClaimsPerChannel={
          SIMPLE_SITE
            ? (dynamicRouteProps && dynamicRouteProps.options && dynamicRouteProps.options.limitClaimsPerChannel) ||
              undefined
            : 3
        }
        meta={!useDualList && getMeta()}
        hasSource
        showNoSourceClaims={ENABLE_NO_SOURCE_CLAIMS}
      />
    </Page>
  );
}

export default DiscoverPage;
