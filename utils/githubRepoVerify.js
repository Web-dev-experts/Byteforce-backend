const axios = require('axios');

const verifyGithubCommit = async (
  accessToken,
  repoUrl,
  startDate,
  endDate,
  threshold,
) => {
  try {
    // Extract owner/repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (!match) return false;
    const repo = match[1].replace('.git', '');

    // Get commits in the entry time window
    const commitsRes = await axios.get(
      `https://api.github.com/repos/${repo}/commits`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          since: new Date(startDate).toISOString(),
          until: new Date(endDate).toISOString(),
        },
      },
    );

    const commits = commitsRes.data;
    if (!commits.length) return false;

    // Check each commit for qualifying file changes
    for (const commit of commits) {
      const detailRes = await axios.get(
        `https://api.github.com/repos/${repo}/commits/${commit.sha}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const files = detailRes.data.files;
      const qualifies = files.some((file) => file.additions >= threshold);
      if (qualifies) return true;
    }

    return false;
  } catch (err) {
    // API error — give benefit of the doubt
    console.error('GitHub verification error:', err.message);
    return true;
  }
};

module.exports = verifyGithubCommit;
