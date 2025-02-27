// @flow
import { MAIN_CLASS } from 'constants/classnames';
import type { Node } from 'react';
import React, { useEffect } from 'react';
import classnames from 'classnames';
import ClaimPreview from 'component/claimPreview';
import Spinner from 'component/spinner';
import { FormField } from 'component/common/form';
import usePersistedState from 'effects/use-persisted-state';
import debounce from 'util/debounce';
import ClaimPreviewTile from 'component/claimPreviewTile';

const DEBOUNCE_SCROLL_HANDLER_MS = 150;
const SORT_NEW = 'new';
const SORT_OLD = 'old';

type Props = {
  uris: Array<string>,
  prefixUris?: Array<string>,
  header: Node | boolean,
  headerAltControls: Node,
  loading: boolean,
  type: string,
  activeUri?: string,
  empty?: string,
  defaultSort?: boolean,
  onScrollBottom?: (any) => void,
  page?: number,
  pageSize?: number,
  // If using the default header, this is a unique ID needed to persist the state of the filter setting
  persistedStorageKey?: string,
  showHiddenByUser: boolean,
  showUnresolvedClaims?: boolean,
  renderActions?: (Claim) => ?Node,
  renderProperties?: (Claim) => ?Node,
  includeSupportAction?: boolean,
  injectedItem: ?Node,
  timedOutMessage?: Node,
  tileLayout?: boolean,
  searchInLanguage: boolean,
  hideMenu?: boolean,
  claimSearchByQuery: { [string]: Array<string> },
  claimsByUri: { [string]: any },
  collectionId?: string,
  showNoSourceClaims?: boolean,
  onClick?: (e: any, claim?: ?Claim, index?: number) => void,
  maxClaimRender?: number,
  excludeUris?: Array<string>,
  loadedCallback?: (number) => void,
};

export default function ClaimList(props: Props) {
  const {
    activeUri,
    uris,
    prefixUris,
    headerAltControls,
    loading,
    persistedStorageKey,
    empty,
    defaultSort,
    type,
    header,
    onScrollBottom,
    pageSize,
    page,
    showHiddenByUser,
    showUnresolvedClaims,
    includeSupportAction,
    injectedItem,
    timedOutMessage,
    tileLayout = false,
    renderActions,
    renderProperties,
    searchInLanguage,
    hideMenu,
    collectionId,
    showNoSourceClaims,
    onClick,
    maxClaimRender,
    excludeUris = [],
    loadedCallback,
  } = props;

  const [currentSort, setCurrentSort] = usePersistedState(persistedStorageKey, SORT_NEW);

  // Exclude prefix uris in these results variables. We don't want to show
  // anything if the search failed or timed out.
  const timedOut = uris === null;
  const urisLength = (uris && uris.length) || 0;

  let tileUris = (prefixUris || []).concat(uris || []);
  tileUris = tileUris.filter((uri) => !excludeUris.includes(uri));

  const totalLength = tileUris.length;

  if (maxClaimRender) tileUris = tileUris.slice(0, maxClaimRender);

  let sortedUris = (urisLength > 0 && (currentSort === SORT_NEW ? tileUris : tileUris.slice().reverse())) || [];

  React.useEffect(() => {
    if (typeof loadedCallback === 'function') loadedCallback(totalLength);
  }, [totalLength]); // eslint-disable-line react-hooks/exhaustive-deps

  const noResultMsg = searchInLanguage
    ? __('No results. Contents may be hidden by the Language filter.')
    : __('No results');

  function handleSortChange() {
    setCurrentSort(currentSort === SORT_NEW ? SORT_OLD : SORT_NEW);
  }

  const handleClaimClicked = React.useCallback(
    (e, claim, index) => {
      if (onClick) {
        onClick(e, claim, index);
      }
    },
    [onClick]
  );

  const customShouldHide = React.useCallback((claim: StreamClaim) => {
    // Hack to hide spee.ch thumbnail publishes
    // If it meets these requirements, it was probably uploaded here:
    // https://github.com/lbryio/lbry-redux/blob/master/src/redux/actions/publish.js#L74-L79
    return claim.name.length === 24 && !claim.name.includes(' ') && claim.value.author === 'Spee.ch';
  }, []);

  useEffect(() => {
    const handleScroll = debounce((e) => {
      if (page && pageSize && onScrollBottom) {
        const mainEl = document.querySelector(`.${MAIN_CLASS}`);

        if (mainEl && !loading && urisLength >= pageSize) {
          const contentWrapperAtBottomOfPage = mainEl.getBoundingClientRect().bottom - 0.5 <= window.innerHeight;

          if (contentWrapperAtBottomOfPage) {
            onScrollBottom();
          }
        }
      }
    }, DEBOUNCE_SCROLL_HANDLER_MS);

    if (onScrollBottom) {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [loading, onScrollBottom, urisLength, pageSize, page]);

  return tileLayout && !header ? (
    <section className="claim-grid">
      {urisLength > 0 &&
        tileUris.map((uri) => (
          <ClaimPreviewTile
            key={uri}
            uri={uri}
            showHiddenByUser={showHiddenByUser}
            properties={renderProperties}
            collectionId={collectionId}
            showNoSourceClaims={showNoSourceClaims}
          />
        ))}
      {!timedOut && urisLength === 0 && !loading && <div className="empty main--empty">{empty || noResultMsg}</div>}
      {timedOut && timedOutMessage && <div className="empty main--empty">{timedOutMessage}</div>}
    </section>
  ) : (
    <section
      className={classnames('claim-list', {
        'claim-list--small': type === 'small',
      })}
    >
      {header !== false && (
        <React.Fragment>
          {header && (
            <div className={classnames('claim-list__header', { 'section__title--small': type === 'small' })}>
              {header}
              {loading && <Spinner type="small" />}
              {(headerAltControls || defaultSort) && (
                <div className="claim-list__alt-controls">
                  {headerAltControls}
                  {defaultSort && (
                    <FormField
                      className="claim-list__dropdown"
                      type="select"
                      name="file_sort"
                      value={currentSort}
                      onChange={handleSortChange}
                    >
                      <option value={SORT_NEW}>{__('Newest First')}</option>
                      <option value={SORT_OLD}>{__('Oldest First')}</option>
                    </FormField>
                  )}
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      )}

      {urisLength > 0 && (
        <ul
          className={classnames('ul--no-style', {
            card: !(tileLayout || type === 'small'),
            'claim-list--card-body': tileLayout,
          })}
        >
          {sortedUris.map((uri, index) => (
            <React.Fragment key={uri}>
              {injectedItem && index === 4 && <li>{injectedItem}</li>}
              <ClaimPreview
                uri={uri}
                indexInContainer={index}
                type={type}
                active={activeUri && uri === activeUri}
                hideMenu={hideMenu}
                includeSupportAction={includeSupportAction}
                showUnresolvedClaim={showUnresolvedClaims}
                properties={renderProperties || (type !== 'small' ? undefined : false)}
                renderActions={renderActions}
                showUserBlocked={showHiddenByUser}
                showHiddenByUser={showHiddenByUser}
                collectionId={collectionId}
                showNoSourceClaims={showNoSourceClaims}
                customShouldHide={customShouldHide}
                onClick={handleClaimClicked}
              />
            </React.Fragment>
          ))}
        </ul>
      )}

      {!timedOut && urisLength === 0 && !loading && <div className="empty empty--centered">{empty || noResultMsg}</div>}
      {!loading && timedOut && timedOutMessage && <div className="empty empty--centered">{timedOutMessage}</div>}
    </section>
  );
}
