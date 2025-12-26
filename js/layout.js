(() => {
  const state = {
    filter: "all",
    route: "home",
  };

  const tabs = document.getElementById("feed-tabs");
  const tabButtons = Array.from(document.querySelectorAll("#feed-tabs md-primary-tab"));
  const navButtons = Array.from(document.querySelectorAll("[data-route]"));

  const panelMap = {
    all: {
      panel: document.getElementById("panel-all"),
      list: document.getElementById("feed-list-all"),
      empty: document.getElementById("feed-empty-all"),
    },
    following: {
      panel: document.getElementById("panel-following"),
      list: document.getElementById("feed-list-following"),
      empty: document.getElementById("feed-empty-following"),
    },
  };

  const escapeHtml = (value) => {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const formatTime = (isoString) => {
    if (window.Utils && typeof window.Utils.timeAgo === "function") {
      return window.Utils.timeAgo(isoString);
    }
    const time = new Date(isoString);
    if (Number.isNaN(time.getTime())) {
      return "just now";
    }
    return time.toLocaleString();
  };

  const mockFeed = () => {
    return [
      {
        id: Date.now(),
        authorId: "20230001",
        content: "Welcome to CampusLink. Share your campus moment.",
        images: [],
        tags: ["#campus", "#daily"],
        likes: ["20230002"],
        comments: [],
        timestamp: new Date().toISOString(),
      },
    ];
  };

  const getFeedData = (filter) => {
    if (window.DB && typeof window.DB.getFeed === "function") {
      const mapped = filter === "following" ? "following" : "all";
      const data = window.DB.getFeed(mapped);
      return Array.isArray(data) ? data : [];
    }
    return mockFeed();
  };

  const normalizePost = (post) => {
    return {
      id: post.id,
      authorId: post.authorId || "unknown",
      content: post.content || "",
      tags: Array.isArray(post.tags) ? post.tags : [],
      likes: Array.isArray(post.likes) ? post.likes : [],
      comments: Array.isArray(post.comments) ? post.comments : [],
      timestamp: post.timestamp || new Date().toISOString(),
    };
  };

  const getActivePanel = () => {
    return panelMap[state.filter] || panelMap.all;
  };

  const renderFeed = () => {
    const panel = getActivePanel();
    const posts = getFeedData(state.filter).map(normalizePost);

    panel.list.innerHTML = "";

    if (!posts.length) {
      panel.empty.hidden = false;
      return;
    }

    panel.empty.hidden = true;

    const fragment = document.createDocumentFragment();
    posts.forEach((post, index) => {
      const card = document.createElement("article");
      card.className = "post-card";
      card.style.animationDelay = `${index * 0.05}s`;

      const tagsMarkup = post.tags
        .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
        .join("");

      card.innerHTML = `
        <div class="post-header">
          <div class="post-author md-typescale-title-small">${escapeHtml(
            post.authorId
          )}</div>
          <div class="post-meta md-typescale-body-small">${escapeHtml(
            formatTime(post.timestamp)
          )}</div>
        </div>
        <div class="post-content md-typescale-body-medium">${escapeHtml(
          post.content
        )}</div>
        <div class="post-tags">${tagsMarkup}</div>
        <div class="post-actions">
          <md-outlined-button type="button">Like ${post.likes.length}</md-outlined-button>
          <md-outlined-button type="button">Comment ${post.comments.length}</md-outlined-button>
          <md-text-button type="button">Share</md-text-button>
        </div>
      `;
      fragment.appendChild(card);
    });

    panel.list.appendChild(fragment);
  };

  const setActiveFilter = (filter) => {
    state.filter = filter;
    const index = filter === "following" ? 1 : 0;

    if (tabs && "activeTabIndex" in tabs) {
      tabs.activeTabIndex = index;
    }

    tabButtons.forEach((tab, tabIndex) => {
      tab.toggleAttribute("active", tabIndex === index);
    });

    Object.entries(panelMap).forEach(([key, panel]) => {
      panel.panel.hidden = key !== filter;
    });

    renderFeed();
  };

  const setActiveRoute = (route) => {
    state.route = route;
    navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.route === route);
    });
  };

  if (tabs) {
    tabs.addEventListener("change", () => {
      const index = typeof tabs.activeTabIndex === "number" ? tabs.activeTabIndex : 0;
      const nextFilter = tabButtons[index]?.dataset.filter || "all";
      setActiveFilter(nextFilter);
    });
  }

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveRoute(button.dataset.route);
    });
  });

  if (window.DB && typeof window.DB.on === "function") {
    window.DB.on("db:update", () => renderFeed());
  }

  setActiveFilter(state.filter);
  setActiveRoute(state.route);

  if (window.customElements && customElements.whenDefined) {
    customElements.whenDefined("md-tabs").then(() => {
      setActiveFilter(state.filter);
    });
  }
})();
