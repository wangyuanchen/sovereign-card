"use client";

import Image from "next/image";
import { useState } from "react";

interface NFTData {
  contract_name: string;
  contract_address: string;
  nft_data?: Array<{
    token_id: string;
    external_data?: {
      name: string;
      description?: string;
      image: string;
      image_256?: string;
    };
  }>;
}

interface NFTGalleryProps {
  nfts: { items?: NFTData[] } | null;
}

export default function NFTGallery({ nfts }: NFTGalleryProps) {
  const [selectedNFT, setSelectedNFT] = useState<{
    name: string;
    image: string;
    collection: string;
    description?: string;
    tokenId: string;
  } | null>(null);

  if (!nfts?.items?.length) {
    return (
      <div className="text-center py-12 text-text-muted">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-sm">No NFTs found</p>
      </div>
    );
  }

  // Flatten all NFTs
  const allNFTs = nfts.items.flatMap((collection) =>
    (collection.nft_data || []).map((nft) => ({
      name: nft.external_data?.name || `#${nft.token_id}`,
      image: nft.external_data?.image_256 || nft.external_data?.image || "",
      collection: collection.contract_name,
      description: nft.external_data?.description,
      tokenId: nft.token_id,
    }))
  ).filter((nft) => nft.image);

  if (allNFTs.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-sm">No NFTs with images found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {allNFTs.slice(0, 12).map((nft, idx) => (
          <button
            key={`${nft.collection}-${nft.tokenId}-${idx}`}
            onClick={() => setSelectedNFT(nft)}
            className="group relative aspect-square rounded-xl overflow-hidden
              border border-border-subtle hover:border-accent-purple/50
              transition-all duration-300 hover:scale-[1.02]
              bg-bg-elevated"
          >
            <Image
              src={nft.image}
              alt={nft.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-0 left-0 right-0 p-2
              translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-xs font-medium text-white truncate">{nft.name}</p>
              <p className="text-[10px] text-text-secondary truncate">{nft.collection}</p>
            </div>
          </button>
        ))}
      </div>

      {allNFTs.length > 12 && (
        <p className="text-center text-xs text-text-muted mt-3">
          +{allNFTs.length - 12} more NFTs
        </p>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedNFT(null)}
        >
          <div
            className="relative max-w-lg w-full bg-bg-card rounded-2xl border border-border-subtle p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedNFT(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="relative aspect-square w-full max-w-sm mx-auto rounded-xl overflow-hidden mb-4">
              <Image
                src={selectedNFT.image}
                alt={selectedNFT.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            <h3 className="text-lg font-bold text-text-primary">{selectedNFT.name}</h3>
            <p className="text-sm text-accent-cyan">{selectedNFT.collection}</p>
            {selectedNFT.description && (
              <p className="mt-2 text-sm text-text-secondary line-clamp-3">
                {selectedNFT.description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
