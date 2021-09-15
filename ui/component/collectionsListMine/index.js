import { connect } from 'react-redux';
import {
  selectBuiltinCollections,
  selectMyPublishedPlaylistCollections,
  selectMyUnpublishedCollections, // should probably distinguish types
  // selectSavedCollections,
  selectFetchingMyCollections,
} from 'lbry-redux';
import CollectionsListMine from './view';

const select = (state) => ({
  builtinCollections: selectBuiltinCollections(state),
  publishedCollections: selectMyPublishedPlaylistCollections(state),
  unpublishedCollections: selectMyUnpublishedCollections(state),
  // savedCollections: selectSavedCollections(state),
  fetchingCollections: selectFetchingMyCollections(state),
});

export default connect(select)(CollectionsListMine);
