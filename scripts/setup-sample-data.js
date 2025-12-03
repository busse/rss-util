const fs = require('fs').promises;
const path = require('path');
const os = require('os');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getDateOffset(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 3600000).toISOString();
}

async function setupSampleData() {
  // Create temporary directory
  const tempDir = path.join(os.tmpdir(), `rss-util-screenshots-${Date.now()}`);
  const dataDir = path.join(tempDir, 'data');
  
  await fs.mkdir(dataDir, { recursive: true });
  
  // Categories
  const categories = [
    {
      id: 'tech',
      name: 'Technology',
      icon: '💻'
    },
    {
      id: 'news',
      name: 'News',
      icon: '📰'
    },
    {
      id: 'science',
      name: 'Science',
      icon: '🔬'
    }
  ];
  
  // Feeds
  const feeds = [
    {
      id: 'feed-techcrunch',
      title: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      category: 'tech',
      icon: 'T',
      status: 'healthy',
      lastUpdated: getDateOffset(2)
    },
    {
      id: 'feed-hackernews',
      title: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      category: 'tech',
      icon: 'H',
      status: 'healthy',
      lastUpdated: getDateOffset(1)
    },
    {
      id: 'feed-verge',
      title: 'The Verge',
      url: 'https://www.theverge.com/rss/index.xml',
      category: 'tech',
      icon: 'V',
      status: 'healthy',
      lastUpdated: getDateOffset(3)
    },
    {
      id: 'feed-ars',
      title: 'Ars Technica',
      url: 'https://feeds.arstechnica.com/arstechnica/index',
      category: 'tech',
      icon: 'A',
      status: 'healthy',
      lastUpdated: getDateOffset(4)
    },
    {
      id: 'feed-bbc',
      title: 'BBC News',
      url: 'http://feeds.bbci.co.uk/news/rss.xml',
      category: 'news',
      icon: 'B',
      status: 'healthy',
      lastUpdated: getDateOffset(2)
    },
    {
      id: 'feed-nature',
      title: 'Nature',
      url: 'https://www.nature.com/nature.rss',
      category: 'science',
      icon: 'N',
      status: 'healthy',
      lastUpdated: getDateOffset(5)
    }
  ];
  
  // Articles for each feed
  const articlesData = {
    'feed-techcrunch': {
      feedId: 'feed-techcrunch',
      lastFetched: getDateOffset(2),
      articles: [
        {
          id: 'article-tc-1',
          title: 'AI Startup Raises $50M Series B to Revolutionize Enterprise Software',
          link: 'https://techcrunch.com/example-1',
          description: 'A promising AI startup has secured significant funding to transform how enterprises approach software development.',
          content: '<p>In a major funding round announced today, AI startup InnovateAI has raised $50 million in Series B funding led by prominent venture capital firms. The company plans to use the capital to expand its enterprise software platform that leverages artificial intelligence to automate complex business processes.</p><p>The funding comes at a time when enterprise software is undergoing a significant transformation, with AI playing an increasingly central role. "We\'re seeing unprecedented demand from Fortune 500 companies looking to modernize their operations," said CEO Sarah Chen.</p><p>The platform has already attracted major clients including several tech giants and financial institutions. With this new funding, the company plans to double its engineering team and expand into new markets.</p>',
          pubDate: getDateOffset(2),
          author: 'Sarah Perez',
          categories: ['AI', 'Enterprise', 'Funding']
        },
        {
          id: 'article-tc-2',
          title: 'New JavaScript Framework Promises 10x Performance Improvement',
          link: 'https://techcrunch.com/example-2',
          description: 'Developers are excited about a new framework that claims to dramatically improve web application performance.',
          content: '<p>A new JavaScript framework called LightningJS is making waves in the developer community with claims of 10x performance improvements over existing solutions. The framework, developed by a team of former Google engineers, uses innovative compilation techniques to optimize code execution.</p><p>"We\'ve rethought everything from the ground up," explained lead developer Mark Thompson. "Our virtual DOM implementation is fundamentally different, and we\'ve eliminated many of the bottlenecks that plague other frameworks."</p><p>Early benchmarks show impressive results, with applications built on LightningJS loading significantly faster and using less memory. The framework is currently in beta, with a full release planned for next quarter.</p>',
          pubDate: getDateOffset(5),
          author: 'Frederic Lardinois',
          categories: ['JavaScript', 'Web Development']
        },
        {
          id: 'article-tc-3',
          title: 'Cybersecurity Firm Discovers Critical Vulnerability in Popular Cloud Service',
          link: 'https://techcrunch.com/example-3',
          description: 'A security research firm has identified a serious vulnerability affecting millions of cloud service users.',
          content: '<p>Security researchers at CyberGuard Labs have discovered a critical vulnerability in a widely-used cloud storage service that could potentially expose user data. The vulnerability, which affects the service\'s authentication system, has been responsibly disclosed to the vendor.</p><p>"This is one of the most serious vulnerabilities we\'ve seen this year," said security researcher Dr. Emily Rodriguez. "The potential impact is significant, affecting millions of users worldwide."</p><p>The cloud service provider has acknowledged the issue and is working on a patch, expected to be released within 48 hours. Users are advised to enable two-factor authentication as an additional security measure.</p>',
          pubDate: getDateOffset(8),
          author: 'Zack Whittaker',
          categories: ['Security', 'Cloud']
        }
      ]
    },
    'feed-hackernews': {
      feedId: 'feed-hackernews',
      lastFetched: getDateOffset(1),
      articles: [
        {
          id: 'article-hn-1',
          title: 'Show HN: Open Source Alternative to Popular SaaS Tool',
          link: 'https://news.ycombinator.com/item?id=example1',
          description: 'A developer has released an open-source alternative to a popular SaaS tool, gaining significant traction.',
          content: '<p>After years of frustration with expensive SaaS tools, developer Alex Kim has released an open-source alternative that\'s gaining significant traction in the developer community. The tool, called OpenSaaS, provides many of the same features as its commercial counterparts but with full source code access.</p><p>"I built this because I was tired of paying $50/month for features I could implement myself," Kim explained. "Now the community can benefit from it, and we can all contribute improvements."</p><p>The project has already received over 1,000 stars on GitHub and has active contributors from around the world. The community is working on adding new features and improving documentation.</p>',
          pubDate: getDateOffset(1),
          author: 'alexkim',
          categories: ['Open Source', 'SaaS']
        },
        {
          id: 'article-hn-2',
          title: 'Ask HN: How do you manage technical debt in a fast-growing startup?',
          link: 'https://news.ycombinator.com/item?id=example2',
          description: 'A discussion thread about managing technical debt as startups scale rapidly.',
          content: '<p>Technical debt is one of the biggest challenges facing fast-growing startups. As teams scale and features ship rapidly, code quality can suffer. This Ask HN thread has generated hundreds of responses from experienced engineers sharing their strategies.</p><p>Common themes include: dedicating 20% of sprint time to refactoring, maintaining comprehensive test coverage, and making technical debt visible to the entire team. Many respondents emphasize the importance of balancing speed with maintainability.</p><p>One particularly insightful comment suggests treating technical debt like financial debt - understanding the interest rate and paying it down strategically rather than all at once.</p>',
          pubDate: getDateOffset(4),
          author: 'startup_engineer',
          categories: ['Engineering', 'Startups']
        }
      ]
    },
    'feed-verge': {
      feedId: 'feed-verge',
      lastFetched: getDateOffset(3),
      articles: [
        {
          id: 'article-verge-1',
          title: 'The Future of Electric Vehicles: What to Expect in 2025',
          link: 'https://www.theverge.com/example-1',
          description: 'A comprehensive look at upcoming EV technology and market trends.',
          content: '<p>Electric vehicles are set to undergo significant changes in 2025, with new battery technologies, improved charging infrastructure, and more affordable models hitting the market. Major automakers are investing billions in EV development, signaling a major shift in the industry.</p><p>New solid-state battery technology promises to double range while reducing charging times. Several manufacturers have announced plans to incorporate these batteries in their 2025 model year vehicles.</p><p>The charging infrastructure is also expanding rapidly, with thousands of new fast-charging stations being installed across the country. This expansion addresses one of the main concerns consumers have about switching to electric vehicles.</p>',
          pubDate: getDateOffset(3),
          author: 'Andrew J. Hawkins',
          categories: ['Electric Vehicles', 'Technology']
        },
        {
          id: 'article-verge-2',
          title: 'Review: The Latest Smartphone Camera Technology is Impressive',
          link: 'https://www.theverge.com/example-2',
          description: 'A detailed review of cutting-edge smartphone camera features.',
          content: '<p>The latest generation of smartphones features camera technology that rivals professional equipment. Computational photography has advanced to the point where smartphone photos can compete with dedicated cameras in many scenarios.</p><p>New AI-powered features automatically adjust settings, enhance images, and even remove unwanted objects from photos. These features are powered by advanced machine learning models running directly on the device.</p><p>Professional photographers are increasingly using smartphones for certain types of photography, particularly for social media content and quick captures. The gap between smartphone and dedicated camera continues to narrow.</p>',
          pubDate: getDateOffset(6),
          author: 'Vlad Savov',
          categories: ['Smartphones', 'Photography']
        }
      ]
    },
    'feed-ars': {
      feedId: 'feed-ars',
      lastFetched: getDateOffset(4),
      articles: [
        {
          id: 'article-ars-1',
          title: 'Scientists Achieve Breakthrough in Quantum Computing Stability',
          link: 'https://arstechnica.com/example-1',
          description: 'Researchers have made significant progress in maintaining quantum coherence for longer periods.',
          content: '<p>In a major breakthrough for quantum computing, researchers have successfully maintained quantum coherence for over 10 seconds - a significant improvement over previous records. This advancement brings practical quantum computing applications closer to reality.</p><p>The research team used a combination of error correction techniques and improved qubit isolation to achieve this milestone. "This is a crucial step toward building reliable quantum computers," said lead researcher Dr. Maria Santos.</p><p>Quantum computers have the potential to solve problems that are intractable for classical computers, including drug discovery, cryptography, and optimization problems. However, maintaining quantum states has been one of the biggest challenges.</p>',
          pubDate: getDateOffset(4),
          author: 'John Timmer',
          categories: ['Quantum Computing', 'Science']
        }
      ]
    },
    'feed-bbc': {
      feedId: 'feed-bbc',
      lastFetched: getDateOffset(2),
      articles: [
        {
          id: 'article-bbc-1',
          title: 'Global Climate Summit Reaches Historic Agreement',
          link: 'https://www.bbc.com/news/example-1',
          description: 'World leaders have agreed on ambitious new climate targets.',
          content: '<p>In a historic development, world leaders at the Global Climate Summit have reached a comprehensive agreement on new emissions targets. The agreement commits participating nations to reduce carbon emissions by 50% by 2030.</p><p>"This is a turning point in our fight against climate change," said the summit\'s host. "We\'ve shown that when we work together, we can achieve ambitious goals."</p><p>The agreement includes provisions for financial support to developing nations, technology transfer programs, and regular review mechanisms to ensure progress is being made.</p>',
          pubDate: getDateOffset(2),
          author: 'BBC News',
          categories: ['Climate', 'Politics']
        },
        {
          id: 'article-bbc-2',
          title: 'Space Mission Successfully Lands on Distant Asteroid',
          link: 'https://www.bbc.com/news/example-2',
          description: 'A space probe has successfully collected samples from an asteroid millions of miles away.',
          content: '<p>A space mission has successfully landed on a distant asteroid and collected valuable samples that could provide insights into the early solar system. The mission, which took years to plan and execute, represents a major achievement in space exploration.</p><p>The samples will be returned to Earth for detailed analysis. Scientists hope to learn about the composition of asteroids and potentially gain insights into how planets formed.</p><p>"This is like opening a time capsule from the early solar system," explained mission scientist Dr. James Wilson. "The samples could answer fundamental questions about our cosmic origins."</p>',
          pubDate: getDateOffset(7),
          author: 'BBC Science',
          categories: ['Space', 'Science']
        }
      ]
    },
    'feed-nature': {
      feedId: 'feed-nature',
      lastFetched: getDateOffset(5),
      articles: [
        {
          id: 'article-nature-1',
          title: 'Breakthrough in Gene Therapy Shows Promise for Rare Diseases',
          link: 'https://www.nature.com/example-1',
          description: 'New gene therapy techniques offer hope for patients with previously untreatable conditions.',
          content: '<p>Researchers have developed a new gene therapy approach that shows remarkable promise for treating rare genetic diseases. The technique uses advanced CRISPR technology to precisely edit genes, correcting mutations that cause debilitating conditions.</p><p>In clinical trials, patients with a rare genetic disorder showed significant improvement after treatment. "This could be life-changing for patients who previously had no treatment options," said lead researcher Dr. Jennifer Lee.</p><p>The therapy works by delivering the gene-editing machinery directly to affected cells, where it makes precise corrections. The approach has been refined to minimize off-target effects and improve safety.</p>',
          pubDate: getDateOffset(5),
          author: 'Nature Editorial',
          categories: ['Medicine', 'Genetics']
        }
      ]
    }
  };
  
  // Read states (mix of read and unread)
  const readStates = {
    'article-tc-2': {
      read: true,
      readAt: getDateOffset(4)
    },
    'article-hn-2': {
      read: true,
      readAt: getDateOffset(3)
    },
    'article-verge-2': {
      read: true,
      readAt: getDateOffset(5)
    },
    'article-bbc-2': {
      read: true,
      readAt: getDateOffset(6)
    }
  };
  
  // AI Summaries (for articles with summaries)
  const aiSummaries = {
    'article-tc-1': {
      summary: 'AI startup InnovateAI has raised $50M in Series B funding to expand its enterprise software platform. The company, which automates complex business processes using AI, plans to double its engineering team and expand into new markets. The funding round was led by prominent venture capital firms, and the platform has already attracted major clients including Fortune 500 companies [1]. The company\'s CEO, Sarah Chen, noted unprecedented demand from large enterprises looking to modernize operations [2].',
      footnotes: [
        { title: 'InnovateAI Platform', url: 'https://innovateai.example.com/platform' },
        { title: 'Enterprise AI Solutions', url: 'https://example.com/enterprise-ai' }
      ],
      generatedAt: getDateOffset(1.5)
    },
    'article-tc-3': {
      summary: 'Security researchers at CyberGuard Labs discovered a critical vulnerability in a widely-used cloud storage service that could expose user data. The vulnerability affects the service\'s authentication system and has been responsibly disclosed. The cloud provider is working on a patch expected within 48 hours, and users are advised to enable two-factor authentication [1]. The potential impact is significant, affecting millions of users worldwide according to security researcher Dr. Emily Rodriguez [2].',
      footnotes: [
        { title: 'Cloud Security Best Practices', url: 'https://example.com/cloud-security' },
        { title: 'CyberGuard Labs Research', url: 'https://cyberguard.example.com/research' }
      ],
      generatedAt: getDateOffset(7)
    },
    'article-hn-1': {
      summary: 'Developer Alex Kim has released OpenSaaS, an open-source alternative to popular SaaS tools that has gained significant traction. The project addresses frustration with expensive commercial tools by providing similar features with full source code access. The project has received over 1,000 GitHub stars and has active contributors worldwide [1]. Kim built the tool after growing tired of paying $50/month for features he could implement himself [2].',
      footnotes: [
        { title: 'OpenSaaS on GitHub', url: 'https://github.com/example/opensaas' },
        { title: 'Open Source Alternatives', url: 'https://example.com/opensource-alternatives' }
      ],
      generatedAt: getDateOffset(0.5)
    },
    'article-verge-1': {
      summary: 'Electric vehicles are set for significant changes in 2025, with new solid-state battery technology promising to double range while reducing charging times. Major automakers are investing billions in EV development, and the charging infrastructure is expanding rapidly with thousands of new fast-charging stations [1]. Several manufacturers have announced plans to incorporate solid-state batteries in their 2025 model year vehicles [2].',
      footnotes: [
        { title: 'EV Charging Infrastructure Map', url: 'https://example.com/ev-charging' },
        { title: 'Solid-State Battery Technology', url: 'https://example.com/solid-state-batteries' }
      ],
      generatedAt: getDateOffset(2.5)
    },
    'article-ars-1': {
      summary: 'Researchers have achieved a breakthrough in quantum computing by maintaining quantum coherence for over 10 seconds, a significant improvement. The team used error correction techniques and improved qubit isolation to achieve this milestone [1]. This advancement brings practical quantum computing applications closer to reality, with potential applications in drug discovery, cryptography, and optimization [2].',
      footnotes: [
        { title: 'Quantum Computing Research', url: 'https://example.com/quantum-research' },
        { title: 'Quantum Error Correction', url: 'https://example.com/quantum-error-correction' }
      ],
      generatedAt: getDateOffset(3.5)
    }
  };
  
  // Settings with feature flags enabled
  const settings = {
    featureFlags: {
      aiArticleSummary: true
    },
    encryptedApiKey: null // Will be set by the app if needed, but we'll show it as configured
  };
  
  // Write all files
  await fs.writeFile(
    path.join(dataDir, 'categories.json'),
    JSON.stringify(categories, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'feeds.json'),
    JSON.stringify(feeds, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'read-states.json'),
    JSON.stringify(readStates, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'settings.json'),
    JSON.stringify(settings, null, 2)
  );
  
  await fs.writeFile(
    path.join(dataDir, 'ai-summaries.json'),
    JSON.stringify(aiSummaries, null, 2)
  );
  
  // Write article files for each feed
  for (const [feedId, data] of Object.entries(articlesData)) {
    await fs.writeFile(
      path.join(dataDir, `articles-${feedId}.json`),
      JSON.stringify(data, null, 2)
    );
  }
  
  return tempDir;
}

module.exports = { setupSampleData };

// Allow running directly for testing
if (require.main === module) {
  setupSampleData()
    .then(dir => {
      console.log(`Sample data created at: ${dir}`);
    })
    .catch(err => {
      console.error('Error setting up sample data:', err);
      process.exit(1);
    });
}

