import * as PAGES from 'constants/pages';
import { DOMAIN } from 'config';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { PAGE_SIZE } from 'constants/claim';
import {
  makeSelectClaimForUri,
  selectIsUriResolving,
  makeSelectTotalPagesForChannel,
  selectTitleForUri,
  selectClaimIsMine,
  makeSelectClaimIsPending,
  selectIsStreamPlaceholderForUri,
} from 'redux/selectors/claims';
import {
  makeSelectCollectionForId,
  makeSelectUrlsForCollectionId,
  makeSelectIsResolvingCollectionForId,
} from 'redux/selectors/collections';
import { doResolveUri } from 'redux/actions/claims';
import { doClearPublish, doPrepareEdit } from 'redux/actions/publish';
import { doFetchItemsInCollection } from 'redux/actions/collections';
import { normalizeURI } from 'util/lbryURI';
import * as COLLECTIONS_CONSTS from 'constants/collections';
import { push } from 'connected-react-router';
import { selectIsSubscribedForUri } from 'redux/selectors/subscriptions';
import { selectBlacklistedOutpointMap } from 'lbryinc';
import { doAnalyticsView } from 'redux/actions/app';
import ShowPage from './view';

const select = (state, props) => {
  const { pathname, hash, search } = props.location;
  const urlPath = pathname + hash;
  const urlParams = new URLSearchParams(search);

  // Remove the leading "/" added by the browser
  let path = urlPath.slice(1).replace(/:/g, '#');

  // Google cache url
  // ex: webcache.googleusercontent.com/search?q=cache:MLwN3a8fCbYJ:https://lbry.tv/%40Bombards_Body_Language:f+&cd=12&hl=en&ct=clnk&gl=us
  // Extract the lbry url and use that instead
  // Without this it will try to render lbry://search
  if (search && search.startsWith('?q=cache:')) {
    const googleCacheRegex = new RegExp(`(https://${DOMAIN}/)([^+]*)`);
    const [x, y, googleCachedUrl] = search.match(googleCacheRegex); // eslint-disable-line
    if (googleCachedUrl) {
      const actualUrl = decodeURIComponent(googleCachedUrl);
      if (actualUrl) {
        path = actualUrl.replace(/:/g, '#');
      }
    }
  }

  let uri;
  try {
    uri = normalizeURI(path);
  } catch (e) {
    const match = path.match(/[#/:]/);

    if (path === '$/') {
      props.history.replace(`/`);
    } else if (!path.startsWith('$/') && match && match.index) {
      uri = `lbry://${path.slice(0, match.index)}`;
      props.history.replace(`/${path.slice(0, match.index)}`);
    }
  }
  const claim = makeSelectClaimForUri(uri)(state);
  const collectionId =
    urlParams.get(COLLECTIONS_CONSTS.COLLECTION_ID) ||
    (claim && claim.value_type === 'collection' && claim.claim_id) ||
    null;

  return {
    uri,
    claim,
    isResolvingUri: selectIsUriResolving(state, uri),
    blackListedOutpointMap: selectBlacklistedOutpointMap(state),
    totalPages: makeSelectTotalPagesForChannel(uri, PAGE_SIZE)(state),
    isSubscribed: selectIsSubscribedForUri(state, uri),
    title: selectTitleForUri(state, uri),
    claimIsMine: selectClaimIsMine(state, claim),
    claimIsPending: makeSelectClaimIsPending(uri)(state),
    isLivestream: selectIsStreamPlaceholderForUri(state, uri),
    collection: makeSelectCollectionForId(collectionId)(state),
    collectionId: collectionId,
    collectionUrls: makeSelectUrlsForCollectionId(collectionId)(state),
    isResolvingCollection: makeSelectIsResolvingCollectionForId(collectionId)(state),
  };
};

const perform = (dispatch) => ({
  resolveUri: (uri, returnCached, resolveRepost, options) =>
    dispatch(doResolveUri(uri, returnCached, resolveRepost, options)),
  beginPublish: (name) => {
    dispatch(doClearPublish());
    dispatch(doPrepareEdit({ name }));
    dispatch(push(`/$/${PAGES.UPLOAD}`));
  },
  fetchCollectionItems: (claimId) => dispatch(doFetchItemsInCollection({ collectionId: claimId })),
  doAnalyticsView: (uri) => dispatch(doAnalyticsView(uri)),
});

export default withRouter(connect(select, perform)(ShowPage));
