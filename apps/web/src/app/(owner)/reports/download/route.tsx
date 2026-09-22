import { requireOwner } from '@/lib/auth/session';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import {
  getReport,
  KIGALI_TIME_ZONE,
  money,
} from '@/lib/reports/report-data';

export const runtime = 'nodejs';

type ReportPdfProps = {
  report: Awaited<
    ReturnType<
      typeof getReport
    >
  >;
};

const styles =
  StyleSheet.create({
    page: {
      padding: 32,
      backgroundColor:
        '#FAFAFC',
      color: '#222222',
      fontSize: 9,
      fontFamily:
        'Helvetica',
    },

    header: {
      backgroundColor:
        '#222222',
      color: '#FFFFFF',
      padding: 18,
      marginBottom: 14,
    },

    eyebrow: {
      color: '#E87517',
      fontSize: 8,
      letterSpacing: 1.6,
      textTransform:
        'uppercase',
      marginBottom: 5,
    },

    title: {
      fontSize: 21,
      fontWeight: 700,
      marginBottom: 5,
    },

    subtitle: {
      color: '#D1D5DB',
      fontSize: 9,
    },

    result: {
      backgroundColor:
        '#FFFFFF',
      border:
        '1 solid #E5E7EB',
      padding: 15,
      marginBottom: 12,
    },

    resultLabel: {
      color: '#6B7280',
      fontSize: 8,
      textTransform:
        'uppercase',
      letterSpacing: 1.2,
    },

    resultValue: {
      fontSize: 22,
      fontWeight: 700,
      marginTop: 5,
    },

    resultHelper: {
      color: '#6B7280',
      fontSize: 8,
      marginTop: 4,
    },

    summaryGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },

    summaryCard: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
      border:
        '1 solid #E5E7EB',
      padding: 9,
    },

    label: {
      color: '#6B7280',
      fontSize: 7,
      marginBottom: 4,
    },

    summaryValue: {
      fontSize: 11,
      fontWeight: 700,
    },

    section: {
      backgroundColor:
        '#FFFFFF',
      border:
        '1 solid #E5E7EB',
      padding: 13,
      marginBottom: 11,
    },

    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      marginBottom: 8,
    },

    twoColumns: {
      flexDirection: 'row',
      gap: 10,
    },

    column: {
      flex: 1,
    },

    row: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      borderTop:
        '1 solid #EEEEEE',
      paddingVertical: 6,
      gap: 10,
    },

    firstRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
      justifyContent:
        'space-between',
      paddingVertical: 6,
      gap: 10,
    },

    rowLabel: {
      flex: 1,
      color: '#4B5563',
    },

    rowStrong: {
      flex: 1,
      fontWeight: 700,
    },

    rowValue: {
      width: 105,
      textAlign: 'right',
      fontWeight: 700,
    },

    positive: {
      color: '#5F8A63',
    },

    negative: {
      color: '#E85D5D',
    },

    productMeta: {
      color: '#6B7280',
      fontSize: 7,
      marginTop: 2,
    },

    empty: {
      color: '#6B7280',
      fontSize: 8,
      paddingVertical: 4,
    },

    footer: {
      marginTop: 4,
      textAlign: 'center',
      color: '#6B7280',
      fontSize: 7,
    },
  });

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <Text
        style={styles.label}
      >
        {label}
      </Text>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function ReportRow({
  label,
  value,
  index,
  tone,
  strong,
}: {
  label: string;
  value: string;
  index: number;
  tone?:
    | 'positive'
    | 'negative';
  strong?: boolean;
}) {
  const valueStyle = [
    styles.rowValue,
    tone === 'positive'
      ? styles.positive
      : {},
    tone === 'negative'
      ? styles.negative
      : {},
  ];

  return (
    <View
      style={
        index === 0
          ? styles.firstRow
          : styles.row
      }
    >
      <Text
        style={
          strong
            ? styles.rowStrong
            : styles.rowLabel
        }
      >
        {label}
      </Text>

      <Text
        style={valueStyle}
      >
        {value}
      </Text>
    </View>
  );
}

function ReportPdf({
  report,
}: ReportPdfProps) {
  const { summary } =
    report;

  const hasSalesActivity =
    summary.salesCount > 0;

  const hasPaymentActivity =
    report.paymentRows.length > 0;

  const hasExpenseActivity =
    report.expenseCategoryRows.length > 0;

  const hasProductActivity =
    report.productRows.length > 0;

  const hasActivity =
    hasSalesActivity ||
    hasPaymentActivity ||
    hasExpenseActivity ||
    hasProductActivity;

  const hasProfitActivity =
    hasSalesActivity ||
    hasExpenseActivity;

  const hasLoss =
    summary.netProfit < 0;

  const resultValue =
    hasLoss
      ? Math.abs(
          summary.netProfit,
        )
      : summary.netProfit;

  const resultLabel =
    !hasActivity
      ? 'No activity'
      : hasLoss
        ? 'Net loss'
        : summary.netProfit >
            0
          ? 'Net profit'
          : 'Net result';

  const resultHelper =
    !hasActivity
      ? 'No sales, payments or expenses were recorded in this period.'
      : !hasProfitActivity
        ? 'Payments were recorded in this period. No sales or expenses were recorded.'
        : summary.netProfit > 0
          ? 'The boutique made a profit in this period.'
          : summary.netProfit < 0
            ? 'Costs and expenses were higher than profit from sales.'
            : 'The boutique broke even in this period.';

  const profitRows: Array<{
    label: string;
    value: string;
    tone?:
      | 'positive'
      | 'negative';
    strong?: boolean;
  }> = [];

  if (
    summary.discountTotal >
    0
  ) {
    profitRows.push({
      label:
        'Sales before discount',
      value: money(
        summary.salesBeforeDiscount,
      ),
    });

    profitRows.push({
      label: 'Discounts',
      value: `- ${money(
        summary.discountTotal,
      )}`,
      tone: 'negative',
    });
  }

  profitRows.push({
    label: 'Sales',
    value: money(
      summary.salesTotal,
    ),
  });

  profitRows.push({
    label:
      'Cost of items sold',
    value: `- ${money(
      summary.costOfItemsSold,
    )}`,
    tone: 'negative',
  });

  profitRows.push({
    label: 'Gross profit',
    value: money(
      summary.grossProfit,
    ),
    tone:
      summary.grossProfit >=
      0
        ? 'positive'
        : 'negative',
  });

  profitRows.push({
    label: 'Expenses',
    value: `- ${money(
      summary.expensesTotal,
    )}`,
    tone: 'negative',
  });

  profitRows.push({
    label: resultLabel,
    value: money(
      resultValue,
    ),
    tone: hasLoss
      ? 'negative'
      : summary.netProfit >
          0
        ? 'positive'
        : undefined,
    strong: true,
  });

  const generatedAt =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          KIGALI_TIME_ZONE,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(),
    );

  return (
    <Document>
      <Page
        size="A4"
        style={styles.page}
      >
        <View
          style={styles.header}
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            Mama&apos;s Pride
            Boutique
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Business report
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {
              report.period
                .label
            }
          </Text>
        </View>

        <View
          style={
            styles.result
          }
        >
          <Text
            style={
              styles.resultLabel
            }
          >
            {resultLabel}
          </Text>

          <Text
            style={[
              styles.resultValue,
              hasLoss
                ? styles.negative
                : summary.netProfit >
                    0
                  ? styles.positive
                  : {},
            ]}
          >
            {money(
              resultValue,
            )}
          </Text>

          <Text
            style={
              styles.resultHelper
            }
          >
            {resultHelper}
          </Text>
        </View>

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            label="Sales"
            value={money(
              summary.salesTotal,
            )}
          />

          <SummaryCard
            label="Money received"
            value={money(
              summary.moneyReceived,
            )}
          />

          <SummaryCard
            label="Expenses"
            value={money(
              summary.expensesTotal,
            )}
          />

          <SummaryCard
            label="Still unpaid"
            value={money(
              summary.stillUnpaid,
            )}
          />
        </View>

        {(hasPaymentActivity || hasProfitActivity) && (
        <View
          style={
            styles.twoColumns
          }
        >
          {hasPaymentActivity && (
          <View
            style={
              styles.column
            }
          >
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Money received
              </Text>

              {report
                .paymentRows
                .length ===
              0 ? (
                <Text
                  style={
                    styles.empty
                  }
                >
                  No customer
                  money received
                  in this period.
                </Text>
              ) : (
                report.paymentRows.map(
                  (
                    row,
                    index,
                  ) => (
                    <ReportRow
                      key={
                        row.method
                      }
                      index={
                        index
                      }
                      label={
                        row.name
                      }
                      value={money(
                        row.total,
                      )}
                      tone={
                        row.total <
                        0
                          ? 'negative'
                          : undefined
                      }
                    />
                  ),
                )
              )}
            </View>
          </View>
          )}

          {hasProfitActivity && (
          <View
            style={
              styles.column
            }
          >
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Profit breakdown
              </Text>

              {profitRows.map(
                (
                  row,
                  index,
                ) => (
                  <ReportRow
                    key={
                      row.label
                    }
                    index={
                      index
                    }
                    label={
                      row.label
                    }
                    value={
                      row.value
                    }
                    tone={
                      row.tone
                    }
                    strong={
                      row.strong
                    }
                  />
                ),
              )}
            </View>
          </View>
          )}
        </View>
        )}

        {(hasExpenseActivity || hasProductActivity) && (
        <View
          style={
            styles.twoColumns
          }
        >
          {hasExpenseActivity && (
          <View
            style={
              styles.column
            }
          >
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Expenses
              </Text>

              {report
                .expenseCategoryRows
                .length ===
              0 ? (
                <Text
                  style={
                    styles.empty
                  }
                >
                  No expenses in
                  this period.
                </Text>
              ) : (
                report.expenseCategoryRows.map(
                  (
                    row,
                    index,
                  ) => (
                    <ReportRow
                      key={
                        row.category
                      }
                      index={
                        index
                      }
                      label={
                        row.category
                      }
                      value={money(
                        row.total,
                      )}
                      tone="negative"
                    />
                  ),
                )
              )}
            </View>
          </View>
          )}

          {hasProductActivity && (
          <View
            style={
              styles.column
            }
          >
            <View
              style={
                styles.section
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Top products sold
              </Text>

              {report
                .productRows
                .length ===
              0 ? (
                <Text
                  style={
                    styles.empty
                  }
                >
                  No products sold
                  in this period.
                </Text>
              ) : (
                report.productRows.map(
                  (
                    row,
                    index,
                  ) => (
                    <View
                      key={
                        row.name
                      }
                      style={
                        index ===
                        0
                          ? styles.firstRow
                          : styles.row
                      }
                    >
                      <View
                        style={{
                          flex: 1,
                        }}
                      >
                        <Text
                          style={
                            styles.rowStrong
                          }
                        >
                          {
                            row.name
                          }
                        </Text>

                        <Text
                          style={
                            styles.productMeta
                          }
                        >
                          {
                            row.quantity
                          }{' '}
                          sold /
                          Profit{' '}
                          {money(
                            row.profit,
                          )}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.rowValue
                        }
                      >
                        {money(
                          row.total,
                        )}
                      </Text>
                    </View>
                  ),
                )
              )}
            </View>
          </View>
          )}
        </View>
        )}

        <Text
          style={
            styles.footer
          }
        >
          Generated{' '}
          {generatedAt} /
          Africa/Kigali /
          Mama&apos;s Pride
          Boutique
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(
  request: Request,
) {
  await requireOwner();

  const url =
    new URL(
      request.url,
    );

  const report =
    await getReport({
      preset:
        url.searchParams.get(
          'preset',
        ),
      fromDate:
        url.searchParams.get(
          'fromDate',
        ),
      fromTime:
        url.searchParams.get(
          'fromTime',
        ),
      toDate:
        url.searchParams.get(
          'toDate',
        ),
      toTime:
        url.searchParams.get(
          'toTime',
        ),
    });

  if (
    report.period.error
  ) {
    return new Response(
      report.period.error,
      {
        status: 400,
        headers: {
          'Content-Type':
            'text/plain; charset=utf-8',
        },
      },
    );
  }

  const mode =
    url.searchParams.get(
      'mode',
    ) === 'inline'
      ? 'inline'
      : 'attachment';

  const pdf =
    await renderToBuffer(
      <ReportPdf
        report={report}
      />,
    );

  const filename =
    `bloom-kigali-report-${report.period.fileLabel}.pdf`;

  return new Response(
    new Uint8Array(pdf),
    {
      headers: {
        'Content-Type':
          'application/pdf',
        'Content-Disposition':
          `${mode}; filename="${filename}"`,
      },
    },
  );
}
