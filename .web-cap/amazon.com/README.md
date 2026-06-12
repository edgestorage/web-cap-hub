# amazon.com Web Cap Scripts

## Description

Reusable Web Cap scripts for reading Amazon shopping pages.

## Scripts

### read-search-products.js

- Description: Reads visible product cards from an Amazon search results page.
- Pages: Amazon search pages such as `https://www.amazon.com/s?...`
- Input: `limit` optional maximum products, default 20; `includeSponsored` optional boolean, default true; `deliveryTextLimit` optional max characters for delivery/offer text.
- Output: `ok`, `url`, `title`, `count`, and `products[]` with `asin`, `title`, `price`, `rating`, `reviews`, `badge`, `delivery`, `sponsored`, and `href`.
- State: Requires an Amazon search results page to be loaded. Reads visible product cards only and does not change account/cart state.

### read-product-detail.js

- Description: Reads product details from the current Amazon product page.
- Pages: Amazon product detail pages such as `https://www.amazon.com/dp/<ASIN>`.
- Input: `bulletLimit` optional maximum feature bullets, default 10; `textLimit` optional maximum characters for long text fields.
- Output: `ok`, `url`, `title`, and `product` with `asin`, `title`, `brand`, `price`, `listPrice`, `rating`, `reviews`, `availability`, `image`, `bullets`, `buyBoxText`, and `canonicalUrl`.
- State: Requires an Amazon product detail page to be loaded. Reads visible product information only and does not change account/cart state.

### read-search-filters.js

- Description: Reads visible filter/refinement links from an Amazon search results page.
- Pages: Amazon search pages such as `https://www.amazon.com/s?...`
- Input: `limit` optional maximum filters, default 120.
- Output: `ok`, `url`, `title`, `count`, and `filters[]` with `label`, `group`, `href`, and `selected`.
- State: Requires an Amazon search results page. Reads filter links only and does not change account/cart state.

### apply-search-filters.js

- Description: Applies Amazon search filters by matching visible filter text.
- Pages: Amazon search pages such as `https://www.amazon.com/s?...`
- Input: `filters` required array of visible labels; `query` optional search query to open first; `matchMode` optional `includes` or `exact`.
- Output: `ok`, `url`, `title`, `applied`, and failure details with `available` filters when a label cannot be found.
- State: Navigates the current tab through filter result URLs. Does not change account/cart state.

### sort-search-results.js

- Description: Sorts an Amazon search results page by a supported order.
- Pages: Amazon search pages such as `https://www.amazon.com/s?...`
- Input: `sort` required: `featured`, `price-asc`, `price-desc`, `reviews`, or `newest`; `query` optional search query to open first.
- Output: `ok`, `url`, `title`, and `sort`.
- State: Navigates the current tab to a sorted search URL. Does not change account/cart state.

### read-product-variants.js

- Description: Reads visible variant dimensions and options from a product detail page.
- Pages: Amazon product detail pages.
- Input: `limit` optional maximum variant options, default 80.
- Output: `ok`, `url`, `title`, `asin`, `count`, and `dimensions[]` with option labels, links, selected state, price, and availability.
- State: Reads visible variant controls only and does not change account/cart state.

### read-similar-products.js

- Description: Reads visible similar, related, or carousel products from the current Amazon page.
- Pages: Amazon product detail and listing pages.
- Input: `limit` optional maximum products, default 20.
- Output: `ok`, `url`, `title`, `count`, and `products[]` with `asin`, `title`, `price`, `rating`, `reviews`, and `href`.
- State: Reads visible product carousel cards only and does not change account/cart state.

### read-product-reviews.js

- Description: Reads visible customer reviews from an Amazon product or reviews page.
- Pages: Amazon product detail or `/product-reviews/<ASIN>` pages.
- Input: `asin` optional ASIN; `limit` optional maximum reviews, default 10; `bodyLimit` optional max characters per review; `step` internal.
- Output: `ok`, `url`, `title`, `asin`, `count`, and `reviews[]` with author, rating, title, date, body, and helpful text.
- State: May navigate to the product reviews page. Reads reviews only and does not change account/cart state.

Example:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/read-search-products.js --input '{"limit":20,"includeSponsored":false}'
```

Read a product detail page:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/read-product-detail.js --input '{"bulletLimit":8}'
```

Read search filters:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/read-search-filters.js --input '{"limit":80}'
```

Apply search filters:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/apply-search-filters.js --input '{"query":"gaming headsets","filters":["4 Stars & Up"],"matchMode":"includes"}'
```

Sort search results:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/sort-search-results.js --input '{"query":"laptop stand","sort":"price-asc"}'
```

Read product variants:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/read-product-variants.js --input '{"limit":40}'
```

Read similar products:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/read-similar-products.js --input '{"limit":10}'
```

Read product reviews:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/amazon.com/read-product-reviews.js --input '{"limit":5}'
```
