import java.util.Arrays;
import java.util.Random;

/**
 * QuickSort 2-way partition, adapted from Sedgewick & Wayne,
 * Algorithms, 4th ed., lecture 2.3 (slides 13, 15, 28).
 *
 * The change for MEDIAN_OF_THREE is deliberately minimal:
 * find median(a[lo], a[mid], a[hi]), then exchange it with a[lo]
 * before calling the SAME partition routine.
 */
public final class QuickPivotSelection {

    public enum Strategy { FIRST, MEDIAN_OF_THREE }

    private QuickPivotSelection() {}

    public static void sort(int[] a, Strategy strategy) {
        if (a == null) throw new IllegalArgumentException("Array is null");
        sort(a, 0, a.length - 1, strategy);
    }

    /** Optional randomized baseline, as in the Princeton slides. */
    public static void sortShuffled(int[] a, Strategy strategy, long seed) {
        if (a == null) throw new IllegalArgumentException("Array is null");
        Random rnd = new Random(seed);
        for (int i = a.length - 1; i > 0; --i) {
            exch(a, i, rnd.nextInt(i + 1));
        }
        sort(a, strategy);
    }

    private static void sort(int[] a, int lo, int hi, Strategy strategy) {
        if (hi <= lo) return;
        if (strategy == Strategy.MEDIAN_OF_THREE) {
            int mid = lo + (hi - lo) / 2;
            int median = medianOf3(a, lo, mid, hi);
            exch(a, lo, median);
        }
        int j = partition(a, lo, hi);
        sort(a, lo, j - 1, strategy);
        sort(a, j + 1, hi, strategy);
    }

    /**
     * Sedgewick's two-way partition: scan from both ends.
     * Unlike a Lomuto partition, both scans stop on equal keys.
     */
    private static int partition(int[] a, int lo, int hi) {
        int i = lo, j = hi + 1;
        while (true) {
            while (a[++i] < a[lo]) {
                if (i == hi) break;
            }
            while (a[lo] < a[--j]) {
                if (j == lo) break;
            }
            if (i >= j) break;
            exch(a, i, j);
        }
        exch(a, lo, j);
        return j;
    }

    /** Index of median of three values, without modifying the array. */
    private static int medianOf3(int[] a, int i, int j, int k) {
        if (a[i] < a[j]) {
            if (a[j] < a[k]) return j;
            return a[i] < a[k] ? k : i;
        }
        if (a[i] < a[k]) return i;
        return a[j] < a[k] ? k : j;
    }

    private static void exch(int[] a, int i, int j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }

    public static void main(String[] args) {
        int[] input = {1, 2, 3, 4, 5, 6, 7};
        for (Strategy strategy : Strategy.values()) {
            int[] copy = input.clone();
            sort(copy, strategy);
            System.out.println(strategy + ": " + Arrays.toString(copy));
        }
    }
}
