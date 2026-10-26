"use client";

import * as React from "react";
import Image from "next/image";
import type { Product } from "@tce/shared";
import { ExternalLink, Package, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
  Skeleton,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { getCatalogProducts, toggleProductSoldOut } from "@/lib/api";
import { formatETB } from "@/lib/utils";

export default function CatalogPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | "in_stock" | "sold_out">("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const fetchCatalog = React.useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      const data = await getCatalogProducts({ filter, search: searchQuery });
      setProducts(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, searchQuery]);

  React.useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  const handleToggleSoldOut = async (product: Product) => {
    const nextState = !product.isSoldOut;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, isSoldOut: nextState } : p)),
    );

    try {
      await toggleProductSoldOut(product.id, nextState);
      if (nextState) {
        toast.warning(
          `Marked "${product.title.slice(0, 25)}..." as Sold Out. Telegram channel button updated to ❌ ተሽጧል.`
        );
      } else {
        toast.success(`Marked "${product.title.slice(0, 25)}..." as In Stock. Order button restored.`);
      }
    } catch {
      // Revert optimistic update on failure
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isSoldOut: !nextState } : p)),
      );
      toast.error("Failed to update product stock status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Channel Catalog / ካታሎግ
          </h1>
          <p className="text-sm text-muted-foreground">
            Automatically ingested from your Telegram channel feed. Toggle availability to update buttons instantly.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchCatalog(true)}
          disabled={isRefreshing}
          className="gap-2 self-start"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Sync Channel / አድስ</span>
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onValueChange={(val) => setFilter(val as typeof filter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="all">All / ሁሉም</TabsTrigger>
            <TabsTrigger value="in_stock">In Stock / ክምችት</TabsTrigger>
            <TabsTrigger value="sold_out">Sold Out / ተሽጧል</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <Package className="size-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium text-foreground">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {searchQuery
              ? "No catalog items matched your search query. Try another term."
              : "Post photos with prices in your Telegram channel to populate your catalog automatically."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

            return (
              <Card
                key={product.id}
                className={`flex flex-col overflow-hidden transition-all duration-200 border-border/80 ${
                  product.isSoldOut ? "opacity-70 bg-card/40" : "bg-card"
                }`}
              >
                {/* Media Image */}
                <div className="relative h-52 w-full bg-muted/40">
                  {product.mediaUrls[0] ? (
                    <Image
                      src={product.mediaUrls[0]}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 300px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="size-8" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex gap-1">
                    {product.isSoldOut ? (
                      <Badge variant="destructive" className="font-semibold text-xs shadow-md">
                        ❌ Sold Out / ተሽጧል
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/90 text-white font-semibold text-xs shadow-md">
                        ✓ In Stock ({totalStock})
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="backdrop-blur-md bg-background/80 font-bold text-xs">
                      {formatETB(product.price)}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardHeader className="p-4 pb-2">
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground leading-snug">
                    {product.title}
                  </h3>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex-1 space-y-3">
                  {/* Variants */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Variants & Stock:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v) => (
                        <span
                          key={v.id}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono border ${
                            v.stockQuantity > 0
                              ? "border-border bg-muted/30 text-foreground"
                              : "border-destructive/30 bg-destructive/10 text-destructive line-through"
                          }`}
                        >
                          <span>{v.variantName}</span>
                          <span className="text-[10px] text-muted-foreground">({v.stockQuantity})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Channel Post Link */}
                  {product.telegramPostUrl && (
                    <a
                      href={product.telegramPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary/80 hover:text-primary transition-colors"
                    >
                      <span>View channel post #{product.telegramMessageId}</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </CardContent>

                {/* Footer Sold Out Toggle */}
                <CardFooter className="border-t border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`sold-out-${product.id}`}
                      checked={!product.isSoldOut}
                      onCheckedChange={() => void handleToggleSoldOut(product)}
                    />
                    <label
                      htmlFor={`sold-out-${product.id}`}
                      className="text-xs font-medium cursor-pointer text-foreground select-none"
                    >
                      {!product.isSoldOut ? "Available for Order" : "Sold Out (ተሽጧል)"}
                    </label>
                  </div>

                  <span className="text-[11px] text-muted-foreground font-mono">
                    ID: {product.id.slice(0, 8)}
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
