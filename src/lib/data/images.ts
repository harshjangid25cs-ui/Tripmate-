/**
 * Catalog Image Asset Resolver
 * Maps Supabase storage paths and entity identifiers to URLs per design-reference/ASSETS.md
 */

const FALLBACK_DESTINATIONS: Record<string, string> = {
  jaipur:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBnfR96SXW5fSYOF2t4e_HJQqkf3v6NMXkr2dO2wv5oNikE4dTyV-yYifxpCZHA9g018lA5XxjNeCfF0Ul5dO06lNp9N4OV9Tp_5DaDjJTtIDot8AJXZ2eyIfLkOQ98lpUnAAZXmbkdByZ_a4rYWngZGYbBUtrE06Rg0IFhCp9qbMxdzGPZRxFKN4qFjZQCndPAmhDwAxfMdsaeP6gEWrFaKVbQTgW2m_xphdaHXaW1m8ePLJf5FuNW2g",
  udaipur:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDWym_vjmPZfcbZ_5ql28liGJnYgWlDxPRt9-exfPn3SvgsrsxHjunR5eC2rQeKXxGTsxianbSDIBVVfyoejRmUdvhfGZVILGrZft_uLXkY-OD1wThW9VnAQge9AA2MQv7t89eytesqATRHhDASG6qdQal0dhxhKnObTMriFlKJRweLjhyki8MR6lisXE5Me8gZvoiwVjzAB3CCL2F2KkaryX2oHkDtQy47-4W01UQ61N5oN7jPd5DZ6Q",
  munnar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBmdPJXxCTtyrE_kFAHYRNgcnw1Rnas0vLOiQFSRxkbA_w7_bU-PkwUSrdbSZLIinowxl_YNo8h86pqiL5UBgFvhKcl3TXWvQYq6ZDbvhk5W_zQ3gpuQoTgTVANwYIHh2M3KYTWySjDyDjsIYY_zBK9Jf7vtR8MZwQdBRrOPV6FY45nXPd9S0yBABrWr-eyckDgvPHX7lNv14KhCuYlRO-RsoiVj0ApetfN1GDGOUmBMxDYWoKHSdTHrQ",
  hampi:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBW-JDK_WFcYv6FwpSomH0nrozQvkYO1W4xehHLKXZwOXBQb4jMzFWLEFCOmO-6PSqheLYb9r_eMY26BYoZHlSjY3f09qoa4kZ87GH3i7qkQGP2QjejuAl-i14excyz_Td834Ebwtz_ZTbeqU8Q_JXWm0DcjjJdzHayv1Jq2-btss2BW0lgZXi6H4khrzjenbEvywBKMCPFmEEZeAMonb03btlsW-LCcKcVmqIhBDPh7Dj_u8-nkJntHA",
};

const FALLBACK_CIRCUITS: Record<string, string> = {
  default:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDqcOUEVn_hjpj22M_ib1R75ejyDFfZ7846yfwTbKYiTYS9_fkORmx68w8nyP7yR_QXFJ7eWEhLv6j4v2gnbdnEmG6PcvSs7FvSe9C-a7VSOtDVZeJwaPRp8IsOY_BEknXMqKPUrG50B_ULpe_2zZvIjs1z5_Nkboy8-VxMHYbTkOfb3FmBePePwzqQTMTjek_o6meWJErH32EFWazKNIBjrygPEGHfBJAyBSVxzTrujeBbtoDMTvP0LA",
  c1:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDqcOUEVn_hjpj22M_ib1R75ejyDFfZ7846yfwTbKYiTYS9_fkORmx68w8nyP7yR_QXFJ7eWEhLv6j4v2gnbdnEmG6PcvSs7FvSe9C-a7VSOtDVZeJwaPRp8IsOY_BEknXMqKPUrG50B_ULpe_2zZvIjs1z5_Nkboy8-VxMHYbTkOfb3FmBePePwzqQTMTjek_o6meWJErH32EFWazKNIBjrygPEGHfBJAyBSVxzTrujeBbtoDMTvP0LA",
  c2:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAF485nHy2dy9GzaOrZyAAysOniyWOTWlZBDngFPUbisSNvQVTRaj4dQ9najhZ0Nygz9Ytp8dDcNLOKCXfX8ZISLpzRcBsOBbOfWu6WPK0nIUj_zrNZPwtJp5pVosnIlR0dJ0PapajRwDWRYnsQ8-PZ_jsBEbCbKBNqPtKdjVlR0zJ593BsjUx1-2I4jO6bCR8ZMpBWYWMHDNEp4GO2f663SS74YXLWXBD3PswhDFZOa42yF_OwSBad1w",
  c3:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCIFj4GNpZqZpF0fYGXqz9xHj1Q9-rBa7io8h38Wei5iQQUTXuZbOSv33RZWmqvU7Nmw96EObSMfn8wBeZwB9nD-b0CwU55HLWN1EZEABKG1HSMVNvVWW7ILkNLQJODKaI3AjscFZa4aadMpF53v08IWnV23mRqZZ7j3TdbWs6eFrK23oyUZlZjxs3cXNdIsy5t_oKnOokXGaLjkbTmrNdzR3rVKk8WEcD0dlxh5tP55RgDfuN9ZUtNKA",
  c4:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD-H0OTY_RBJ0c23s2IYko3MLFLNF-aF_HYrcDBW8YMdHV5mAoXJeOx6QDLbm_nj-IcdR3QScGiJ0y-jshXu27_-k9iPeqWAhHu1K3iqRQAML49YEzPu3dEuPXRx4J7gT56Gy5siy-eIQPyh2eXKD79TuGuLSbKv57dQN44eC4Ny1ahGodcoAncDgbZZG4LLry8jAGeJKON9Ok0vR35km368EzYmaIsmTJsx-m-Rlp-mQq_SyhkrC_C2Q",
  c5:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDQnxnMrLLBabuXK2byT8LyeeXvy6R5z4qKrIngE5VdQtGx-cqvinn0UH0o-Yh6DCulq9ve_t1TebkRIlZ3iP6VXvovLgYc-hFplcLDBtozA1IapcNes7d9WuQIGr0n7hCWm-zBtdyerMVoV23pNajsVQ8nW7ouQ4kvBz6dEdv6CByPoEem4yYAiG4gWKIRK4DL6hOeUJNrTiO3ww1pQS41kYYHIaMwVjgUxxGTDGByEFWmdfFANURp8Q",
};

const FALLBACK_HIGHLIGHTS: Record<number, string> = {
  1: "https://lh3.googleusercontent.com/aida-public/AB6AXuDlSGZd0p-bOzdZvbYsX5at-hIDhEYXqnqJIt3h4Kx2TQPTrYbW5yzhTg871njLSIu5fTXmpB4wmDlgzFhtRPLVXikX41bNiYX28PlGhHJGezGt3xEtZLcLKaS6hseUXIRR2KJj1gRwOsJD0Wdfi70PCdiCSiQXDYBMA17ZLWe48TWB1bkX1zScssbZ7wQ2AKZ2bJVPeRW_55LYJsWQog3Ehzxi_crg0-GnVdPxgu45-sCLUqgUMFUROA",
  2: "https://lh3.googleusercontent.com/aida-public/AB6AXuB-z_gbYcSjWFuS_EvjnDGEh2SpXRvjgnNGTuKxFDwb-mslQVUpKjSljaaiPyBe8vlYWFc5OBYIK8f1Lw29WhpBA0tvsthui1pZtg07Y7ochWPsfmLjQWal_HXu2iJwKugEVh7Dp70VnoU9Rko9iwXXwl7fH3l0NW2eswRdGy5l-yoIfYaKTssATRJ-jTgDgiIDWKDyJ_v6mxfiLyQ4DZ1-sjvJ5XyBhYIerMV2UouPgnHLJTrBX0w4nw",
  3: "https://lh3.googleusercontent.com/aida-public/AB6AXuAu4VtJm6TcZ69zAo7Q1LCdCSfck9rqgK6mxmS_EB0EiaQIE2BgNurCTbRSHNMeSt0k7TpTMUSbWX0O-RVC_1VDTpH8yJrpJ9-wnLRXha05tNsj2evC71-oa-_OxO9aW5Lb5BKl3wbc-rIL3GSMVv7DTlISeGElqlerbp--_rDGCJ8N2kHuj2OTS7SGmKNcZI3W0XFkMX-kiGqXym8te80XABvBLLmSxLBQWMM_CJBHtblgSqGX9kfFOw",
  4: "https://lh3.googleusercontent.com/aida-public/AB6AXuB396ZMpfqfA00YBlMDpFPXLdgbndDuaHEEj4UylyCr3x6vxn7KFe11UeF31wVScoMkVjeIcGnKFch3AqjAiDnVGcnElVKmi1ymX-yjC6MLCUFQYfL_6B1OzbKN1E85B54LRx4Pn8AmMm9WSpesELz7ZmsTut6DCmRnJqRGI4vB2TdcRaR2hvw9ixWoQ790Z1v_18IZluAfYZNTr41qi7mTlxdd0rQry4eBalhMHUFHzfmxcgzqccpSCQ",
};

const FALLBACK_HOTELS: Record<string, string> = {
  shahpura:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuArKo4JfqsVtZX9SQjwB4LHU1PTlAq3mLo9TgePqBObNcZnZB5-4bKPbUKAN2EylTheoo-9SiumJ8Qy4AjYBdCDiEHtY55fSRQYl64lmQltr8x8F3wGnzGWXEH3qaY8cZx6D7YcHa0NE5TNA9Wa0LeFGSV_fopqzpyOgvEq2_zaWT9LYHbvoAY8Mr18U4LLHRWabzTkkUOHVI05DB0tDlr1JZjiCH3EvPFNL-p7cbDk12ZXF2Jpz-sVAw",
  diggi:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCaWvtFBEPg95MnNWLJho2kp3zzwq34tZ_lcHE09GsrwwPUJAaIuic-1pQsxtN13mH9FD5O7NLIDxFcTXh6GkXEwmMsoi3u4J7ZQqFOdCQP8cZCmQjHRHkr_3ew1e_kLIeMCKFL0ICeTpg8sFjR9_l6nQ8EP2CNr4CcPr_6HCycR1YQDLuiKXzJxcFYflUmVkX5Cxl_ovhiVfHT6z0hFqGgWMpwBbOsdQODUd2L9NRyv4PTUiDaFCkpDQ",
  alsisar:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCR8TvMS8uf8dFh8XMWQTikBGKy6wSFfaqpa38paiRnB1omJE2yxgN0xJegOPWdgxi3oPuAAv0i6EZnLvPEF-gApqJDedMuZyQY47WdrtiQ5_lV72VMGXjzc9v-zIzIE7tzZrDFMrZoFdreq7qn0KFXTVnA8wk9QclMDkmxk7dmRy8L-E31pcxVKue0EVbmKDGzgxBymkQNz9XiFQiLA_cmthYNAwD0W0CYhPyTrwybWUokiVqG_KyogA",
  samode:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDjqV6K3NaLbmMJlSrdn-2Wdkv8deKNQVGwKu9MOpAvUcqK4GTcNdxqK1L_DGSu580NRnq59RZk5Ts7fdQhqjoJr-_YSg4OWIUEmtMcKIJPMKL-yizyIHSDy4sP1MNOSBpOMdk8QZRInZydb7MHeeYfQ_cZrmwJexvZASpO3gJFaqLf2as6FFYe20fBZbjIVYevXJk7LXmTA4Fzp9xGYiQRrpiACT70giyHDDUp7fKKZMpxNzAK9ATyvg",
};

const FALLBACK_VEHICLES: Record<string, string> = {
  dzire:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC4ymohRrdGBys1iZzNQh5CgFXytRO0fvIjttxpTLIW2E1et60Ty0t5P6Tyr-GtmdwvwGr3S-V3VUlLHzxqvis6ktPt12BduHMZ8u7yTN-Ga8zM9ro6GWME02C2jJvg0GZrsGllxIClgwM54RSwJeqmT8NA4w7feD8cDWSNwBvzM6-H-XWy67izZ_X52Fb2TJ-_SyFLrftsTeiR9Z9KvE9FJYumOoYpVjuh-xA4N2xxVJvHtHgR1M_Trg=w800",
  innova:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCj78ItIziZcRoFgxQvXY8ETh_MCY0K7mNXa07ttDpTtQBws3GN3SjS40qtDMB9Ey05VR8P92hAewK7VdiGwn9AzgkOM6vctycBzE7gR7_8c9zQXDhkFZE8U5cOnbV9uAfCcspw2GU4AxjtR48yFNk6o0V5kthIEk7giRFQjt_xaaEowkjvqU98PnmL5xWqo24MM1eUhuK7L7HUJ6B15-srN-zQjrAmf6zcoDUcpE-A08f-kE_C1wA3Uw=w800",
  classic:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAsJqqbRl5Hh4gm4adCInmyZ_1lCTv081ZZKA4AZujf-HEGcU1QiSnk_osmcr0LiNdInDZldxUNIH4x6pV38qEIg_4BnITyR6qe2bV0SvDxhDpYTpSM8sAidLr7v-e99nGLzBYAQAgxo5cBhiRgzYwdx4BZK2RdFqAu0oQUxfWUVvPZs35Nic-UOUnVvwtuR9mEIzeLdD-lKp0XLRZV5vBvRtlaDRJAdIWpOZDlEX-QURlEeLjqKQe1tA=w800",
  volvo:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA2DBjRrVNj6U-FkCaASlhgISjGtLcQMca3dN14nnl4n4lRVJSBeK6TgLru3sjwQW3yN1ZKjOEyA-bIQ--sry18YUfWggNeC7-hKRDZvHr9OoCdPkOgTaabahinSmwck-TTCEQvSlWUUidLjmUrO_hypgmCRDzwIqSWKY_gKndTstE7ZEYP9wgJplwqQj6_AX4WW3laX32EvuY4n1ghJj7kpMuryfKd0IWPxqyYPdV9=w800",
  bharatbenz:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCnFHfKzedLPxxDxCTux68ZSD8SUY0F4FlMxKDBhk9IxhhukF_8jrKGVpFwW4i7TnZk07GMzmDEP0N3qoXKs_PxUtu_WQAhytk9znSJW9eF27lgYWpKUdKp0b7kNjTHm8WXc7P3JYU3DAS7tHkFc1E5EKJWeJsEEjebGLmLQWZEQVABWl59W9rpJXU5b9UOP_q9fxh24pg6wwzsLIIeP-WDng3NjNg5teT4emTrg3Ah=w800",
  urbania:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBgaDYt4zli_c4rc8W0RpAbpP47jQRHVYnLzlHkJ5PZ8O1LdJJxwE7sAcMZO_O7SVlH97AaLF7gUxwlrNlboMP0rW-mvOxPINeh1jTN-JOOEF-KqHgmBrjqom5u45L3ypLZjOLLP3bslpehCBUed6T09aRQI-F5VvnAlUvV6J_LXDeCvNpC8Hyu0lYi6DXJyUw5D2hejUZs5VD8_Xh7B-W_TZDptInUZDeF04D76pef=w800",
};

const FALLBACK_STOPS: Record<string, string> = {
  neemrana:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDc3EHUn_snwf2U3Y6zOdIZYdvw8ZXA-QYDfbmZXbI8OeHDNqHnOpxzfsdaSPGVFi4YwT2k72h325SjHrW2stvmqdcDa3HgVYQ57g3gcSDc4_cNGUvzqf2KyhrQ6Gs3bT13aGtwOeaMPjmTs0mZ89YhOtL_ybSVXF2WHDSPl7MrghobixV2I-liYf6ya6MeCoAq3EA3RgT-yAAog31yCxqC4YszmYq6Wc8PPXfg_wVAcNe2f7hP-81phw=w800",
  highway_king:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD5vQEunytb-x1PtTP0adQrR6odomlU_mv5YLW0PnZjgYjRZ5PvFp30RhAWA5YMjfAgx0ivy_kDu8Oco3KlZ_EbY1tmmZlfzfDm-7wkZZ1-JpcxzI80oIt619B9SVsqfSe-WMtrGj4y977vT-jmp4uZKdPepfMuR1MVcQO75Kh5OGjuwQsdJBTICGuKpY7wuguNOAYiFy8cl_i4qeO1Kt4cpsY0KNtKqxgAD-FHc7nSPf0Yj1P8Ddq7KQ=w800",
};

/**
 * Optimizes external CDN URLs (Unsplash, Google User Content, Supabase Storage)
 * to deliver lightweight AVIF/WebP at the exact slot size directly from the CDN edge
 * without routing through Vercel's /_next/image proxy.
 * Completely eliminates broken /images/placeholder.jpg references.
 */
export function optimizeExternalImageUrl(
  url?: string | null,
  width = 800,
  quality = 75
): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === "/images/placeholder.jpg" ||
    trimmed.endsWith("/placeholder.jpg")
  ) {
    return "";
  }

  // Handle data URIs or relative paths
  if (trimmed.startsWith("data:") || trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    // 1. Unsplash: optimize search params for dynamic WebP/AVIF format, crop, width, quality
    if (host === "images.unsplash.com" || host.endsWith(".unsplash.com")) {
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", String(quality));
      return parsed.toString();
    }

    // 2. Google User Content (lh3.googleusercontent.com)
    if (host.includes("googleusercontent.com")) {
      // If a size parameter exists (=w[0-9]+ or =s[0-9]+), cleanly format with width
      if (/=[ws]\d+/i.test(trimmed)) {
        return trimmed.replace(/=[ws]\d+[^&?#]*/i, `=w${width}`);
      }
      return trimmed;
    }

    // 3. Supabase Storage public catalog images: keep direct CDN URL untouched
    // (Supabase free tier does not support /storage/v1/render/image/ transformations)
    if (trimmed.includes("catalog-images") || trimmed.includes("/storage/v1/object/public/")) {
      return trimmed;
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

/**
 * Resolves a stored catalog image path or URL.
 * If the string starts with http://, https://, data:, or /, returns it untouched.
 * Never prepends catalog-images/ to already valid external or absolute URLs.
 * Rejects any broken placeholder.jpg references.
 */
export function resolveCatalogImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  const trimmed = imagePath.trim();
  if (
    !trimmed ||
    trimmed === "/images/placeholder.jpg" ||
    trimmed.endsWith("/placeholder.jpg")
  ) {
    return null;
  }
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${supabaseUrl}/storage/v1/object/public/catalog-images/${trimmed}`;
}

export function getDestinationImageUrl(
  slug: string,
  imagePath?: string | null
): string {
  const resolved = resolveCatalogImageUrl(imagePath);
  if (resolved) {
    return resolved;
  }
  const normalizedSlug = slug.toLowerCase();
  return (
    FALLBACK_DESTINATIONS[normalizedSlug] ??
    FALLBACK_DESTINATIONS["jaipur"]!
  );
}

export function getCircuitImageUrl(
  circuitId?: string | null,
  imagePath?: string | null
): string {
  const resolved = resolveCatalogImageUrl(imagePath);
  if (resolved) {
    return resolved;
  }
  if (circuitId) {
    if (circuitId.startsWith("c1")) return FALLBACK_CIRCUITS["c1"]!;
    if (circuitId.startsWith("c2")) return FALLBACK_CIRCUITS["c2"]!;
    if (circuitId.startsWith("c3")) return FALLBACK_CIRCUITS["c3"]!;
    if (circuitId.startsWith("c4")) return FALLBACK_CIRCUITS["c4"]!;
    if (circuitId.startsWith("c5")) return FALLBACK_CIRCUITS["c5"]!;
  }
  return FALLBACK_CIRCUITS["default"]!;
}

export function getHighlightImageUrl(sortOrder: number): string {
  return (
    FALLBACK_HIGHLIGHTS[sortOrder] ??
    FALLBACK_HIGHLIGHTS[1]!
  );
}

export function getHotelImageUrl(
  nameOrId: string,
  imagePath?: string | null
): string {
  const resolved = resolveCatalogImageUrl(imagePath);
  if (resolved) {
    return resolved;
  }
  const lower = nameOrId.toLowerCase();
  if (lower.includes("shahpura") || lower.startsWith("h1")) return FALLBACK_HOTELS["shahpura"]!;
  if (lower.includes("diggi") || lower.startsWith("h2")) return FALLBACK_HOTELS["diggi"]!;
  if (lower.includes("alsisar") || lower.startsWith("h3")) return FALLBACK_HOTELS["alsisar"]!;
  if (lower.includes("samode")) return FALLBACK_HOTELS["samode"]!;
  return FALLBACK_HOTELS["shahpura"]!;
}

export function getVehicleImageUrl(
  nameOrId: string,
  imagePath?: string | null
): string {
  const resolved = resolveCatalogImageUrl(imagePath);
  if (resolved) {
    return resolved;
  }
  const lower = nameOrId.toLowerCase();
  if (lower.includes("dzire") || lower.startsWith("v1")) return FALLBACK_VEHICLES["dzire"]!;
  if (lower.includes("innova") || lower.startsWith("v2")) return FALLBACK_VEHICLES["innova"]!;
  if (lower.includes("enfield") || lower.includes("classic") || lower.includes("bike") || lower.startsWith("v3")) return FALLBACK_VEHICLES["classic"]!;
  if (lower.includes("volvo") || lower.startsWith("v4")) return FALLBACK_VEHICLES["volvo"]!;
  if (lower.includes("bharatbenz") || lower.startsWith("v5")) return FALLBACK_VEHICLES["bharatbenz"]!;
  if (lower.includes("urbania") || lower.startsWith("v6")) return FALLBACK_VEHICLES["urbania"]!;
  return FALLBACK_VEHICLES["dzire"]!;
}

export function getStopImageUrl(
  nameOrId: string,
  imagePath?: string | null
): string {
  const resolved = resolveCatalogImageUrl(imagePath);
  if (resolved) {
    return resolved;
  }
  const lower = nameOrId.toLowerCase();
  if (lower.includes("neemrana") || lower.startsWith("s1")) return FALLBACK_STOPS["neemrana"]!;
  if (lower.includes("highway") || lower.includes("king") || lower.startsWith("s2")) return FALLBACK_STOPS["highway_king"]!;
  return FALLBACK_STOPS["neemrana"]!;
}

export function getDurationHeroImageUrl(slug = "jaipur"): string {
  if (slug.toLowerCase() === "jaipur") {
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuBuq2eHOCTAa6HdNFZhx2Puv8g-OCIfRETwCPn_xf4J7Hl2W7Ps4L2Kw7tGmewAphWy3F_figvG8vnPBA3Sdbv-MJxX9gp9u_JncIcEYrqpWGvgfjDlNDZ3iwZoMFVV31Dk6tPtF5jeitgyYd9aFlMKKh9Vu9nydP7sfHHEvstPvtsSn4rbdPf_q5z_1y9EFHzr6GPL0ywksrQwyDnp_qkJpJRrrr4FhJdYUXoGXnRClRh_4UJ5GqYRkA";
  }
  return getDestinationImageUrl(slug);
}
