"use client";

import * as React from "react";
import type { Order } from "@tce/shared";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { getOrderStats, getOrders, markOrderFulfilled, type OrderStats } from "@/lib/api";
import { formatAddisDate, formatETB, formatPhone } from "@/lib/utils";

/* -------------------------------------------------------------------------
 * Orders Page Main Component
 * ------------------------------------------------------------------------- */
export default function OrdersPage() {
  const [activeTab, setActiveTab] = React.useState<"to_fulfill" | "completed" | "expired">("to_fulfill");
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [stats, setStats] = React.useState<OrderStats | null>(null);
  const [counts, setCounts] = React.useState({ to_fulfill: 0, completed: 0, expired: 0 });
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Modals state
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [fulfillOrder, setFulfillOrder] = React.useState<Order | null>(null);
  const [fulfillOpen, setFulfillOpen] = React.useState(false);

  const fetchData = React.useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setIsRefreshing(true);

        const [tabOrders, orderStats, allToFulfill, allCompleted, allExpired] = await Promise.all([
          getOrders(activeTab),
          getOrderStats(),
          getOrders("to_fulfill"),
          getOrders("completed"),
          getOrders("expired"),
        ]);

        setOrders(tabOrders);
        setStats(orderStats);
        setCounts({
          to_fulfill: allToFulfill.length,
          completed: allCompleted.length,
          expired: allExpired.length,
        });
      } catch (err: unknown) {
        if (!isBackground) {
          toast.error(err instanceof Error ? err.message : "Failed to load orders");
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab],
  );

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // 10-second polling fallback
  React.useEffect(() => {
    const timer = setInterval(() => void fetchData(true), 10000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleConfirmFulfill = async () => {
    if (!fulfillOrder) return;
    const orderId = fulfillOrder.id;

    // Optimistic UI update
    setOrders((prev) =>
      activeTab === "to_fulfill"
        ? prev.filter((o) => o.id !== orderId)
        : prev.map((o) => (o.id === orderId ? { ...o, status: "fulfilled" } : o)),
    );
    setFulfillOpen(false);

    try {
      await markOrderFulfilled(orderId);
      toast.success(`Order #${orderId} fulfilled! Telegram notification sent to customer.`);
      void fetchData(true);
    } catch {
      toast.error(`Failed to fulfill order #${orderId}`);
      void fetchData(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Live Orders Board / ትዕዛዞች
          </h1>
          <p className="text-sm text-muted-foreground">
            Customer checkouts from your Telegram Mini App. Refreshes automatically.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchData(false)}
          disabled={isRefreshing}
          className="gap-2 self-start"
        >
          <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Refresh / አድስ</span>
        </Button>
      </div>

      {/* Top Stat Cards */}
      {loading || !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`stat-${i}`} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                To Fulfill / የሚዘጋጁ
              </CardTitle>
              <div className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                <Clock className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.toFulfill}</div>
              <p className="text-xs text-muted-foreground mt-1">Paid orders awaiting dispatch</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Today's Sales / የዛሬ ሽያጭ
              </CardTitle>
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatETB(stats.revenueToday)}</div>
              <p className="text-xs text-muted-foreground mt-1">Collected via Telebirr / CBE</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                This Week / የዚህ ሳምንት
              </CardTitle>
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ArrowUpRight className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatETB(stats.revenueThisWeek)}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 calendar days</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expired Holds / ያለፈባቸው
              </CardTitle>
              <div className="flex size-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
                <ShoppingBag className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.expiredHolds}</div>
              <p className="text-xs text-muted-foreground mt-1">Unpaid after 15-min hold</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders Filter Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="to_fulfill" className="gap-1.5 font-medium">
            <span>To Fulfill</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-bold">
              {counts.to_fulfill}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5 font-medium">
            <span>Completed</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
              {counts.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="expired" className="gap-1.5 font-medium">
            <span>Expired</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
              {counts.expired}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders View */}
      {loading ? (
        <Card className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`row-${i}`} className="h-14 w-full" />
          ))}
        </Card>
      ) : orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-border/80">
          <Package className="size-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No orders in this view</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {activeTab === "to_fulfill"
              ? "All paid orders have been fulfilled! New orders will arrive in real time."
              : "No orders match this status tab."}
          </p>
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="border-border/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Fulfillment</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total (ETB)</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-bold text-xs text-foreground">
                        #{order.id}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-foreground">
                            {formatPhone(order.buyerPhone)}
                          </span>
                          <a
                            href={`tel:${order.buyerPhone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <Phone className="size-3" />
                            <span>Call</span>
                          </a>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-medium flex items-center gap-1">
                            {order.fulfillment === "in_store_pickup" ? (
                              <>
                                <Store className="size-3.5 text-muted-foreground" />
                                <span>In-Store Pickup</span>
                              </>
                            ) : (
                              <>
                                <Truck className="size-3.5 text-muted-foreground" />
                                <span>Courier</span>
                              </>
                            )}
                          </span>
                          {order.deliverySubcity && (
                            <span className="text-muted-foreground text-[11px] truncate max-w-44">
                              {order.deliverySubcity}, {order.deliveryLandmark}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setDetailsOpen(true);
                          }}
                          className="text-xs text-primary hover:underline font-medium cursor-pointer"
                        >
                          {order.items.length} item{order.items.length > 1 ? "s" : ""}
                        </button>
                      </TableCell>

                      <TableCell className="font-mono font-bold text-sm text-foreground">
                        {formatETB(order.totalAmount)}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            order.status === "paid" || order.status === "fulfilled"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-[11px]"
                              : "border-destructive/30 bg-destructive/10 text-destructive font-medium text-[11px]"
                          }
                        >
                          {order.paymentProvider ?? "Telebirr"} OK
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => {
                              setSelectedOrder(order);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="size-3.5" />
                            <span>Details</span>
                          </Button>

                          {order.status === "paid" && (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                              onClick={() => {
                                setFulfillOrder(order);
                                setFulfillOpen(true);
                              }}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Fulfill</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {orders.map((order) => (
              <Card key={order.id} className="p-4 space-y-3 border-border/80">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-foreground">
                    #{order.id}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-[11px]"
                  >
                    {order.paymentProvider ?? "Telebirr"} ● {formatETB(order.totalAmount)}
                  </Badge>
                </div>

                <div className="text-xs space-y-1 bg-muted/20 p-2.5 rounded-lg border border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <a
                      href={`tel:${order.buyerPhone}`}
                      className="font-medium text-primary flex items-center gap-1"
                    >
                      <Phone className="size-3" />
                      <span>{order.buyerPhone}</span>
                    </a>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium text-right">
                      {order.fulfillment === "in_store_pickup"
                        ? "In-Store Pickup"
                        : `${order.deliverySubcity ?? "Courier"}, ${order.deliveryLandmark ?? ""}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailsOpen(true);
                    }}
                  >
                    View Items ({order.items.length})
                  </Button>

                  {order.status === "paid" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1 cursor-pointer"
                      onClick={() => {
                        setFulfillOrder(order);
                        setFulfillOpen(true);
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Fulfill</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Details Sheet Modal */}
      {selectedOrder && (
        <Sheet open={detailsOpen} onOpenChange={(open) => !open && setDetailsOpen(false)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-bold font-mono">
                  Order #{selectedOrder.id}
                </SheetTitle>
                <Badge
                  variant="outline"
                  className={
                    selectedOrder.status === "paid" || selectedOrder.status === "fulfilled"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  }
                >
                  {selectedOrder.status === "paid"
                    ? "Paid ● Ready to Fulfill"
                    : selectedOrder.status === "fulfilled"
                    ? "Fulfilled / ተጠናቋል"
                    : "Expired / ጊዜ ያለፈበት"}
                </Badge>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                Placed on {formatAddisDate(selectedOrder.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="py-5 space-y-6">
              {/* Customer & Delivery Information */}
              <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer & Delivery / የደንበኛ መረጃ
                </h4>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{formatPhone(selectedOrder.buyerPhone)}</span>
                  <a
                    href={`tel:${selectedOrder.buyerPhone}`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Phone className="size-3" />
                    <span>Call Customer / ደውል</span>
                  </a>
                </div>

                <Separator />

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    {selectedOrder.fulfillment === "in_store_pickup" ? (
                      <>
                        <Store className="size-4 text-primary" />
                        <span>In-Store Pickup (ሱቅ መጥተው ይወስዳሉ)</span>
                      </>
                    ) : (
                      <>
                        <Truck className="size-4 text-primary" />
                        <span>Courier Delivery (በሞተር ማድረስ)</span>
                      </>
                    )}
                  </div>

                  {selectedOrder.fulfillment === "courier_delivery" && (
                    <div className="flex items-start gap-1.5 text-muted-foreground mt-1 pl-5">
                      <MapPin className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                      <span>
                        {selectedOrder.deliverySubcity ? `${selectedOrder.deliverySubcity} Sub-city, ` : ""}
                        {selectedOrder.deliveryLandmark ?? "Addis Ababa"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Line Items ({selectedOrder.items.length}) / የታዘዙ ዕቃዎች
                </h4>

                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {item.titleSnapshot}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.variantSnapshot ? `Variant: ${item.variantSnapshot} · ` : ""}
                          Qty: {item.quantity} × {formatETB(item.unitPrice)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold font-mono text-foreground">
                        {formatETB(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-muted-foreground">Total Amount</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    {formatETB(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Action */}
              {selectedOrder.status === "paid" && (
                <Button
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm cursor-pointer"
                  onClick={() => {
                    setDetailsOpen(false);
                    setFulfillOrder(selectedOrder);
                    setFulfillOpen(true);
                  }}
                >
                  <CheckCircle2 className="size-4" />
                  <span>Mark as Fulfilled / ተዘጋጅቷል</span>
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Fulfill Confirm Dialog */}
      {fulfillOrder && (
        <Dialog open={fulfillOpen} onOpenChange={(open) => !open && setFulfillOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Fulfill Order #{fulfillOrder.id}?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This will mark all {fulfillOrder.items.length} line items as dispatched and notify the customer.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-2">
              <p className="font-medium text-foreground">
                Telegram Bot will send this notification to the buyer:
              </p>
              <p className="italic text-muted-foreground bg-background/50 p-2.5 rounded border border-border/60">
                "ትዕዛዝዎ #{fulfillOrder.id} ተዘጋጅቷል! / Your order is ready! {fulfillOrder.items.map((i) => `${i.quantity}× ${i.titleSnapshot}`).join(", ")}. The store has dispatched your items."
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setFulfillOpen(false)}>
                Cancel / ተመለስ
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                onClick={handleConfirmFulfill}
              >
                <CheckCircle2 className="size-3.5" />
                <span>Confirm Fulfillment</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
