import java.util.Arrays;
import java.util.Random;

/**
 * QuickSort with first-element and median-of-three pivots.
 * Two-way partition adapted from Sedgewick & Wayne,
 * Algorithms, 4th ed., lecture 2.3.
 */
public final class QuickPivotSelection {

    public enum Strategy { FIRST, MEDIAN_OF_THREE }

    private QuickPivotSelection() {}

    public static void sort(int[] a, Strategy strategy) {
        if (a == null) throw new IllegalArgumentException("Array is null");
        sort(a, 0, a.length - 1, strategy);
    }

    /** Randomized baseline. */
    public static void sortShuffled(int[] a, Strategy strategy, long seed) {
        if (a == null) throw new IllegalArgumentException("Array is null");
        Random rnd = new Random(seed);
        for (int i = a.length - 1; i > 0; --i) {
            exch(a, i, rnd.nextInt(i + 1));
        }
        sort(a, strategy);
    }

    private static void sort(int[] a, int low, int high, Strategy strategy) {
        if (high <= low) return;
        if (strategy == Strategy.MEDIAN_OF_THREE && high - low >= 2) {
            int mid = low + (high - low) / 2;
            int median = medianOf3(a, low, mid, high);
            exch(a, low, median);
        }
        int j = partition(a, low, high);
        sort(a, low, j - 1, strategy);
        sort(a, j + 1, high, strategy);
    }

    /**
     * Sedgewick's two-way partition: scan from both ends.
     * Unlike a Lomuto partition, both scans stop on equal keys.
     */
    private static int partition(int[] a, int low, int high) {
        int i = low, j = high + 1;
        while (true) {
            while (a[++i] < a[low]) {
                if (i == high) break;
            }
            while (a[low] < a[--j]) {
                if (j == low) break;
            }
            if (i >= j) break;
            exch(a, i, j);
        }
        exch(a, low, j);
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
