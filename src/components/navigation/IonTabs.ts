import Vue, { CreateElement, RenderContext, VNode } from 'vue';

// ion-tabs styles
const hostStyles = {
  display: 'flex',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  flexDirection: 'column',
  width: '100%',
  height: '100%',
};

const tabsInner = {
  position: 'relative',
  flex: 1,
};

const tabBars = [] as VNode[];

export default {
  name: 'IonTabs',
  functional: true,
  render(h: CreateElement, { parent, data, slots }: RenderContext) {
    const cachedTabs = parent.$ionic.tabs as VNode[];
    const renderQueue = [] as VNode[];
    const postRenderQueue = [] as VNode[];
    const routePath = parent.$route.path;
    let selectedTab = null;

    if (!parent.$router) {
      throw new Error('IonTabs requires an instance of either VueRouter or IonicVueRouter');
    }

    // Loop through all of the children in the default slot
    for (let i = 0; i < slots().default.length; i++) {
      const vnode = slots().default[i];

      // Not an ion-tab, push to render and post-render processing queues
      if (!vnode.tag || vnode.tag.match(/ion-tab$/) === null) {
        renderQueue.push(vnode);
        postRenderQueue[i] = vnode;
        continue;
      }

      // Check if tab attribute is present
      if (!vnode.data || !vnode.data.attrs || !vnode.data.attrs.tab) {
        throw new Error('The tab attribute is required for an ion-tab element');
      }

      // Render, cache or ignore ion-tabs
      const tabName = vnode.data.attrs.tab;
      const tabMatchesRoute = routePath.indexOf(tabName) > -1;
      const tabIsCached = cachedTabs[i];

      // Landed on tab route
      // Cache the tab, push to render queue and continue iteration
      if (tabMatchesRoute) {
        if (!tabIsCached) {
          cachedTabs[i] = vnode;
        }

        selectedTab = tabName;
        vnode.data.attrs.active = true;
        renderQueue.push(vnode);
        continue;
      }

      // Tab was previously cached, push to render queue but hide it for future display
      if (tabIsCached) {
        renderQueue.push(vnode);
      }
    }

    // Update global cached tabs
    parent.$ionic.tabs = cachedTabs;

    // Post processing after initial render
    // Required for tabs within Vue components or router view
    Vue.nextTick(() => {
      for (let i = 0; i < postRenderQueue.length; i++) {
        const vnode = postRenderQueue[i];
        if (vnode.elm && vnode.elm.nodeName === 'ION-TAB') {
          const ionTab = vnode.elm as HTMLIonTabElement;
          const routeMatch = routePath.indexOf(ionTab.tab) > -1;
          ionTab.active = routeMatch;

          // Loop through all tab-bars and set active tab
          if (routeMatch) {
            for (const tabBar of tabBars) {
              (tabBar.elm as HTMLIonTabBarElement).selectedTab = ionTab.tab;
            }
          }

          parent.$ionic.tabs[i] = vnode;
        }
      }

      // Free tab-bars references
      tabBars.length = 0;
    });

    // Render
    return h('div', { ...data, style: hostStyles }, [
      parseSlot(slots().top, selectedTab),
      h('div', { ...data, class: 'tabs-inner', style: tabsInner }, renderQueue),
      parseSlot(slots().bottom, selectedTab),
    ]);
  }
};

// Search for ion-tab-bar in VNode array
function parseSlot(slot: VNode[], tab: string): VNode[] {
  const vnodes = [] as VNode[];

  if (!slot) {
    return vnodes;
  }

  for (const vnode of slot) {
    vnodes.push(vnode.tag && vnode.tag.match(/ion-tab-bar$/) ? parseTabBar(vnode, tab) : vnode);
  }

  return vnodes;
}

// Set selected tab attribute and click handlers
function parseTabBar(vnode: VNode, tab: string): VNode {
  if (!vnode.data) {
    vnode.data = {
      attrs: {
        'selected-tab': tab,
      },
    };
  } else if (!vnode.data.attrs) {
    vnode.data.attrs = { 'selected-tab': tab };
  } else {
    vnode.data.attrs['selected-tab'] = tab;
  }

  // Loop through ion-tab-buttons and assign click handlers
  if (vnode.children) {
    for (const child of vnode.children) {
      if (child.tag && child.tag === 'ion-tab-button') {
        Object.assign(child.data, {
          on: {
            click: () => {
              vnode.context!.$router.push((child.elm as HTMLIonTabButtonElement).tab || '/');
            }
          }
        });
      }
    }
  }

  // Store a reference to the matched ion-tab-bar
  tabBars.push(vnode);

  return vnode;
}