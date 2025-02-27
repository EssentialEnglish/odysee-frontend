import { connect } from 'react-redux';
import { PAGE_SIZE } from 'constants/claim';
import {
  makeSelectClaimsInChannelForPage,
  makeSelectFetchingChannelClaims,
  selectClaimIsMine,
  makeSelectTotalPagesInChannelSearch,
  selectClaimForUri,
} from 'redux/selectors/claims';
import { doResolveUris } from 'redux/actions/claims';
import * as SETTINGS from 'constants/settings';
import { makeSelectChannelIsMuted } from 'redux/selectors/blocked';
import { withRouter } from 'react-router';
import { selectUserVerifiedEmail } from 'redux/selectors/user';
import { selectClientSetting, selectShowMatureContent } from 'redux/selectors/settings';
import { doFetchActiveLivestream } from 'redux/actions/livestream';
import { selectCurrentChannelStatus } from 'redux/selectors/livestream';

import ChannelContent from './view';

const select = (state, props) => {
  const { search } = props.location;
  const urlParams = new URLSearchParams(search);
  const page = urlParams.get('page') || 0;
  const claim = props.uri && selectClaimForUri(state, props.uri);

  return {
    pageOfClaimsInChannel: makeSelectClaimsInChannelForPage(props.uri, page)(state),
    fetching: makeSelectFetchingChannelClaims(props.uri)(state),
    totalPages: makeSelectTotalPagesInChannelSearch(props.uri, PAGE_SIZE)(state),
    channelIsMine: selectClaimIsMine(state, claim),
    channelIsBlocked: makeSelectChannelIsMuted(props.uri)(state),
    claim,
    isAuthenticated: selectUserVerifiedEmail(state),
    showMature: selectShowMatureContent(state),
    tileLayout: selectClientSetting(state, SETTINGS.TILE_LAYOUT),
    currentChannelStatus: selectCurrentChannelStatus(state),
  };
};

const perform = (dispatch) => ({
  doResolveUris: (uris, returnCachedUris) => dispatch(doResolveUris(uris, returnCachedUris)),
  doFetchActiveLivestream: (channelID) => dispatch(doFetchActiveLivestream(channelID)),
});

export default withRouter(connect(select, perform)(ChannelContent));
