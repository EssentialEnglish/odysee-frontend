// @flow
import { ENABLE_NO_SOURCE_CLAIMS, CHANNEL_STAKED_LEVEL_LIVESTREAM, ENABLE_UI_NOTIFICATIONS } from 'config';
import * as ICONS from 'constants/icons';
import * as MODALS from 'constants/modal_types';
import * as SETTINGS from 'constants/settings';
import * as PAGES from 'constants/pages';
import React from 'react';
import { withRouter } from 'react-router';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import Button from 'component/button';
import WunderBar from 'component/wunderbar';
import Icon from 'component/common/icon';
import { Menu, MenuList, MenuButton, MenuItem, MenuLink } from '@reach/menu-button';
import NavigationButton from 'component/navigationButton';
import { useIsMobile } from 'effects/use-screensize';
import NotificationBubble from 'component/notificationBubble';
import NotificationHeaderButton from 'component/notificationHeaderButton';
import ChannelThumbnail from 'component/channelThumbnail';
import SkipNavigationButton from 'component/skipNavigationButton';
import Logo from 'component/logo';
// @if TARGET='app'
import { remote } from 'electron';
import { IS_MAC } from 'component/app/view';
// @endif

type Props = {
  user: ?User,
  balance: string,
  balance: number,
  roundedBalance: string,
  roundedSpendableBalance: string,
  history: {
    entities: {}[],
    goBack: () => void,
    goForward: () => void,
    index: number,
    length: number,
    location: { pathname: string },
    push: (string) => void,
    replace: (string) => void,
  },
  currentTheme: string,
  automaticDarkModeEnabled: boolean,
  setClientSetting: (string, boolean | string, ?boolean) => void,
  hideBalance: boolean,
  email: ?string,
  authenticated: boolean,
  authHeader: boolean,
  backout: {
    backLabel?: string,
    backNavDefault?: string,
    title: string,
    simpleTitle: string, // Just use the same value as `title` if `title` is already short (~< 10 chars), unless you have a better idea for title overlfow on mobile
  },
  syncError: ?string,
  emailToVerify?: string,
  signOut: () => void,
  doOpenModal: (string, ?{}) => void,
  clearEmailEntry: () => void,
  clearPasswordEntry: () => void,
  hasNavigated: boolean,
  sidebarOpen: boolean,
  setSidebarOpen: (boolean) => void,
  isAbsoluteSideNavHidden: boolean,
  hideCancel: boolean,
  activeChannelClaim: ?ChannelClaim,
  activeChannelStakedLevel: number,
};

const Header = (props: Props) => {
  const {
    balance,
    roundedBalance,
    roundedSpendableBalance,
    history,
    setClientSetting,
    currentTheme,
    automaticDarkModeEnabled,
    hideBalance,
    email,
    authenticated,
    authHeader,
    signOut,
    syncError,
    doOpenModal,
    clearEmailEntry,
    clearPasswordEntry,
    emailToVerify,
    backout,
    sidebarOpen,
    setSidebarOpen,
    isAbsoluteSideNavHidden,
    hideCancel,
    user,
    activeChannelClaim,
    activeChannelStakedLevel,
  } = props;
  const isMobile = useIsMobile();
  // on the verify page don't let anyone escape other than by closing the tab to keep session data consistent
  const isVerifyPage = history.location.pathname.includes(PAGES.AUTH_VERIFY);
  const isSignUpPage = history.location.pathname.includes(PAGES.AUTH);
  const isSignInPage = history.location.pathname.includes(PAGES.AUTH_SIGNIN);
  const isPwdResetPage = history.location.pathname.includes(PAGES.AUTH_PASSWORD_RESET);
  const hasBackout = Boolean(backout);
  const { backLabel, backNavDefault, title: backTitle, simpleTitle: simpleBackTitle } = backout || {};
  const notificationsEnabled = ENABLE_UI_NOTIFICATIONS || (user && user.experimental_ui);
  const livestreamEnabled = Boolean(
    ENABLE_NO_SOURCE_CLAIMS &&
      user &&
      !user.odysee_live_disabled &&
      (activeChannelStakedLevel >= CHANNEL_STAKED_LEVEL_LIVESTREAM || user.odysee_live_enabled)
  );
  const activeChannelUrl = activeChannelClaim && activeChannelClaim.permanent_url;

  // Sign out if they click the "x" when they are on the password prompt
  const authHeaderAction = syncError ? { onClick: signOut } : { navigate: '/' };
  const homeButtonNavigationProps = isVerifyPage ? {} : authHeader ? authHeaderAction : { navigate: '/' };
  const closeButtonNavigationProps = {
    onClick: () => {
      clearEmailEntry();
      clearPasswordEntry();

      if (syncError) {
        signOut();
      }

      if (isSignInPage && !emailToVerify) {
        history.goBack();
      } else if (isSignUpPage) {
        history.goBack();
      } else if (isPwdResetPage) {
        history.goBack();
      } else {
        history.push('/');
      }
    },
  };

  function onBackout(e) {
    const { history, hasNavigated } = props;
    const { goBack, replace } = history;

    window.removeEventListener('popstate', onBackout);

    if (e.type !== 'popstate') {
      // if not initiated by pop (back button)
      if (hasNavigated && !backNavDefault) {
        goBack();
      } else {
        replace(backNavDefault || `/`);
      }
    }
  }

  React.useEffect(() => {
    if (hasBackout) {
      window.addEventListener('popstate', onBackout);
      return () => window.removeEventListener('popstate', onBackout);
    }
  }, [hasBackout]);

  function handleThemeToggle() {
    if (automaticDarkModeEnabled) {
      setClientSetting(SETTINGS.AUTOMATIC_DARK_MODE_ENABLED, false);
    }

    if (currentTheme === 'dark') {
      setClientSetting(SETTINGS.THEME, 'light', true);
    } else {
      setClientSetting(SETTINGS.THEME, 'dark', true);
    }
  }

  const loginButtons = (
    <div className="header__auth-buttons">
      <Button
        navigate={`/$/${PAGES.AUTH_SIGNIN}`}
        button="link"
        label={__('Log In')}
        className="mobile-hidden"
        disabled={user === null}
      />
      <Button navigate={`/$/${PAGES.AUTH}`} button="primary" label={__('Sign Up')} disabled={user === null} />
    </div>
  );

  type BalanceButtonProps = { className: string };
  const BalanceButton = (balanceButtonProps: BalanceButtonProps) => (
    <Button
      title={
        balance > 0
          ? __('Immediately spendable: %spendable_balance%', { spendable_balance: roundedSpendableBalance })
          : __('Your Wallet')
      }
      navigate={`/$/${PAGES.WALLET}`}
      className={classnames(balanceButtonProps.className, 'header__navigation-item--balance')}
      label={hideBalance || Number(roundedBalance) === 0 ? __('Your Wallet') : roundedBalance}
      icon={ICONS.LBC}
      // @if TARGET='app'
      onDoubleClick={(e) => {
        e.stopPropagation();
      }}
      // @endif
    />
  );

  return (
    <header
      className={classnames('header', {
        'header--minimal': authHeader,
        // @if TARGET='app'
        'header--mac': IS_MAC,
        // @endif
      })}
      // @if TARGET='app'
      onDoubleClick={(e) => {
        remote.getCurrentWindow().maximize();
      }}
      // @endif
    >
      <div className="header__contents">
        {!authHeader && backout ? (
          <div className="card__actions--between">
            <Button
              onClick={onBackout}
              button="link"
              label={(backLabel && backLabel) || __('Cancel')}
              icon={ICONS.ARROW_LEFT}
            />
            {backTitle && <h1 className="header__auth-title">{isMobile ? simpleBackTitle || backTitle : backTitle}</h1>}
            {authenticated || !IS_WEB ? (
              <BalanceButton className="header__navigation-item menu__title" />
            ) : (
              loginButtons
            )}
          </div>
        ) : (
          <>
            <div className="header__navigation">
              <SkipNavigationButton />
              {!authHeader && (
                <span style={{ position: 'relative' }}>
                  <Button
                    aria-label={
                      sidebarOpen
                        ? __('Close sidebar - hide channels you are following.')
                        : __('Expand sidebar - view channels you are following.')
                    }
                    className="header__navigation-item menu__title header__navigation-item--icon"
                    icon={ICONS.MENU}
                    aria-expanded={sidebarOpen}
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                  >
                    {isAbsoluteSideNavHidden && isMobile && notificationsEnabled && <NotificationBubble />}
                  </Button>
                </span>
              )}
              <Button
                aria-label={__('Home')}
                className="header__navigation-item header__navigation-item--lbry"
                onClick={() => {
                  if (history.location.pathname === '/') window.location.reload();
                }}
                // @if TARGET='app'
                onDoubleClick={(e) => {
                  e.stopPropagation();
                }}
                // @endif
                {...homeButtonNavigationProps}
              >
                <Logo />
              </Button>

              {/* @if process.env.DEV_CHANGELOG */}
              {history.location.pathname === '/' && (
                <Button
                  title={'Changelog'}
                  className="badge--alert"
                  label={'Changelog'}
                  icon={ICONS.FEEDBACK}
                  onClick={() => {
                    doOpenModal(MODALS.CONFIRM, {
                      title: __('Changelog'),
                      subtitle: __('Warning: this is a test instance.'),
                      body: <p style={{ whiteSpace: 'pre-wrap' }}>{process.env.DEV_CHANGELOG}</p>,
                      onConfirm: (closeModal) => closeModal(),
                      hideCancel: true,
                    });
                  }}
                />
              )}
              {/* @endif */}

              {!authHeader && (
                <div className="header__center">
                  {/* @if TARGET='app' */}
                  {!authHeader && (
                    <div className="header__buttons">
                      <NavigationButton isBackward history={history} />
                      <NavigationButton isBackward={false} history={history} />
                    </div>
                  )}
                  {/* @endif */}

                  {!authHeader && <WunderBar />}

                  <HeaderMenuButtons
                    authenticated={authenticated}
                    notificationsEnabled={notificationsEnabled}
                    history={history}
                    handleThemeToggle={handleThemeToggle}
                    currentTheme={currentTheme}
                    livestreamEnabled={livestreamEnabled}
                  />
                </div>
              )}
            </div>

            {!authHeader && !backout ? (
              <div className={classnames('header__menu', { 'header__menu--with-balance': !IS_WEB || authenticated })}>
                {(!IS_WEB || authenticated) && (
                  <BalanceButton className="header__navigation-item menu__title mobile-hidden" />
                )}

                {IS_WEB && !authenticated && loginButtons}

                {(authenticated || !IS_WEB) && (
                  <Menu>
                    <MenuButton
                      aria-label={__('Your account')}
                      title={__('Your account')}
                      className={classnames('header__navigation-item', {
                        'menu__title header__navigation-item--icon': !activeChannelUrl,
                        'header__navigation-item--profile-pic': activeChannelUrl,
                      })}
                      // @if TARGET='app'
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                      }}
                      // @endif
                    >
                      {activeChannelUrl ? (
                        <ChannelThumbnail uri={activeChannelUrl} small noLazyLoad />
                      ) : (
                        <Icon size={18} icon={ICONS.ACCOUNT} aria-hidden />
                      )}
                    </MenuButton>
                    <MenuList className="menu__list--header">
                      <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.UPLOADS}`}>
                        <Icon aria-hidden icon={ICONS.PUBLISH} />
                        {__('Uploads')}
                      </MenuLink>
                      <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.CHANNELS}`}>
                        <Icon aria-hidden icon={ICONS.CHANNEL} />
                        {__('Channels')}
                      </MenuLink>
                      <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.CREATOR_DASHBOARD}`}>
                        <Icon aria-hidden icon={ICONS.ANALYTICS} />
                        {__('Creator Analytics')}
                      </MenuLink>
                      <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.REWARDS}`}>
                        <Icon aria-hidden icon={ICONS.REWARDS} />
                        {__('Rewards')}
                      </MenuLink>
                      <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.INVITE}`}>
                        <Icon aria-hidden icon={ICONS.INVITE} />
                        {__('Invites')}
                      </MenuLink>

                      {authenticated ? (
                        <MenuItem onSelect={IS_WEB ? signOut : () => doOpenModal(MODALS.SIGN_OUT)}>
                          <div className="menu__link">
                            <Icon aria-hidden icon={ICONS.SIGN_OUT} />
                            {__('Sign Out')}
                          </div>
                          <span className="menu__link-help">{email}</span>
                        </MenuItem>
                      ) : !IS_WEB ? (
                        <>
                          <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.AUTH}`}>
                            <Icon aria-hidden icon={ICONS.SIGN_UP} />
                            {__('Sign Up')}
                          </MenuLink>
                          <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.AUTH_SIGNIN}`}>
                            <Icon aria-hidden icon={ICONS.SIGN_IN} />
                            {__('Sign In')}
                          </MenuLink>
                        </>
                      ) : null}
                    </MenuList>
                  </Menu>
                )}
              </div>
            ) : (
              !isVerifyPage &&
              !hideCancel && (
                <div className="header__menu">
                  {/* Add an empty span here so we can use the same style as above */}
                  {/* This pushes the close button to the right side */}
                  <span />

                  <Button
                    title={__('Go Back')}
                    button="alt"
                    // className="button--header-close"
                    icon={ICONS.REMOVE}
                    {...closeButtonNavigationProps}
                    // @if TARGET='app'
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                    }}
                    // @endif
                  />
                </div>
              )
            )}
          </>
        )}
      </div>
    </header>
  );
};

type HeaderMenuButtonProps = {
  authenticated: boolean,
  notificationsEnabled: boolean,
  history: { push: (string) => void },
  handleThemeToggle: (string) => void,
  currentTheme: string,
  livestreamEnabled: boolean,
};

function HeaderMenuButtons(props: HeaderMenuButtonProps) {
  const { authenticated, notificationsEnabled, handleThemeToggle, currentTheme, livestreamEnabled } = props;

  return (
    <div className="header__buttons">
      {(authenticated || !IS_WEB) && (
        <Menu>
          <MenuButton
            aria-label={__('Publish a file, or create a channel')}
            title={__('Publish a file, or create a channel')}
            className="header__navigation-item menu__title header__navigation-item--icon mobile-hidden"
            // @if TARGET='app'
            onDoubleClick={(e) => {
              e.stopPropagation();
            }}
            // @endif
          >
            <Icon size={18} icon={ICONS.PUBLISH} aria-hidden />
          </MenuButton>

          <MenuList className="menu__list--header">
            <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.UPLOAD}`}>
              <Icon aria-hidden icon={ICONS.PUBLISH} />
              {__('Upload')}
            </MenuLink>
            <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.CHANNEL_NEW}`}>
              <Icon aria-hidden icon={ICONS.CHANNEL} />
              {__('New Channel')}
            </MenuLink>
            {/* @if TARGET='web' */}
            <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.YOUTUBE_SYNC}`}>
              <Icon aria-hidden icon={ICONS.YOUTUBE} />
              {__('Sync YouTube Channel')}
            </MenuLink>
            {/* @endif */}
            {livestreamEnabled && (
              <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.LIVESTREAM}`}>
                <Icon aria-hidden icon={ICONS.VIDEO} />
                {__('Go Live')}
              </MenuLink>
            )}
          </MenuList>
        </Menu>
      )}

      {notificationsEnabled && <NotificationHeaderButton />}

      <Menu>
        <MenuButton
          aria-label={__('Settings')}
          title={__('Settings')}
          className="header__navigation-item menu__title header__navigation-item--icon  mobile-hidden"
          // @if TARGET='app'
          onDoubleClick={(e) => {
            e.stopPropagation();
          }}
          // @endif
        >
          <Icon size={18} icon={ICONS.SETTINGS} aria-hidden />
        </MenuButton>
        <MenuList className="menu__list--header">
          <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.SETTINGS}`}>
            <Icon aria-hidden tooltip icon={ICONS.SETTINGS} />
            {__('Settings')}
          </MenuLink>
          <MenuLink className="menu__link" as={Link} to={`/$/${PAGES.HELP}`}>
            <Icon aria-hidden icon={ICONS.HELP} />
            {__('Help')}
          </MenuLink>
          <MenuItem className="menu__link" onSelect={handleThemeToggle}>
            <Icon icon={currentTheme === 'light' ? ICONS.DARK : ICONS.LIGHT} />
            {currentTheme === 'light' ? __('Dark') : __('Light')}
          </MenuItem>
        </MenuList>
      </Menu>
    </div>
  );
}

export default withRouter(Header);
