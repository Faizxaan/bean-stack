// Manual-use only: re-run the Java snippet check across all topics.
//
//   node scripts/check-java-snippets.mjs
//
// NOT wired into npm scripts or the build. It extracts every ```java
// fence from content/topics and:
//  - statically flags a used JDK type with no import (a small known-type
//    table; java.lang needs no import) and a setter called on a variable
//    whose type is defined in the same fence but declares no such setter;
//  - when a JDK is on PATH, compiles the self-contained fences (imports
//    only from java.*, one public top-level type) with javac in a temp
//    dir. Fences needing Spring/Jakarta/JUnit/Mockito or another project
//    are reported as skipped, not as failures, and bare fragments (no
//    type declaration) are intentional teaching excerpts, not programs.
//    Preview fences compile with --enable-preview --release <host javac
//    major>: javac rejects --enable-preview with any older --release
//    (compiler.err.preview.not.latest — preview features are only
//    supported for the compiler's own release), so the hardcoded
//    --release 21 only worked on a JDK 21 host. Non-preview fences
//    compile with --release 21 (the app's target LTS) when the host
//    supports it, otherwise with no --release flag. A fence whose
//    compile failure is deliberate lives in COMPILE_ALLOWLIST below
//    with a one-line reason, and is reported as allowed, not a failure.
//  - if no JDK is found it says so plainly and runs the static checks
//    only. It never claims a compile ran when one did not. Preview
//    fences are still named in the output without a JDK, so the list
//    does not silently claim "none".
//
// Exit code: 1 if any attempted compile failed or any static flag was
// raised, else 0. A fence that needs --enable-preview (StructuredTaskScope,
// ScopedValue) is compiled with it and named in the output.
import { execFileSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const topicsDir = path.join(root, 'content', 'topics')

// No import needed for these (java.lang).
const JAVA_LANG = new Set(
  'String Integer Long Double Float Boolean Byte Short Character Void Object Class System Math Thread Runnable Exception RuntimeException Error Throwable StringBuilder StringBuffer Comparable Iterable Enum Number IllegalArgumentException IllegalStateException NullPointerException InterruptedException Runtime Override FunctionalInterface Deprecated SuppressWarnings SafeVarargs'.split(' '),
)

// Known java.* type -> package, for the missing-import check.
const KNOWN = {
  Executors: 'java.util.concurrent', ExecutorService: 'java.util.concurrent',
  CompletableFuture: 'java.util.concurrent', CountDownLatch: 'java.util.concurrent',
  Semaphore: 'java.util.concurrent', CyclicBarrier: 'java.util.concurrent',
  Phaser: 'java.util.concurrent', ReentrantLock: 'java.util.concurrent.locks',
  Condition: 'java.util.concurrent.locks', AtomicInteger: 'java.util.concurrent.atomic',
  AtomicLong: 'java.util.concurrent.atomic', ConcurrentHashMap: 'java.util.concurrent',
  ArrayList: 'java.util', HashMap: 'java.util', HashSet: 'java.util',
  LinkedList: 'java.util', ArrayDeque: 'java.util', List: 'java.util',
  Map: 'java.util', Set: 'java.util', Optional: 'java.util', Arrays: 'java.util',
  Collections: 'java.util', Comparator: 'java.util', Scanner: 'java.util',
  UUID: 'java.util', Locale: 'java.util', Random: 'java.util',
  Stream: 'java.util.stream', Collectors: 'java.util.stream',
  IntPredicate: 'java.util.function', Predicate: 'java.util.function',
  Function: 'java.util.function', Consumer: 'java.util.function',
  Supplier: 'java.util.function', BiFunction: 'java.util.function',
  LocalDate: 'java.time', LocalDateTime: 'java.time', LocalTime: 'java.time',
  Instant: 'java.time', Duration: 'java.time', Period: 'java.time',
  ZonedDateTime: 'java.time', DateTimeFormatter: 'java.time.format',
  Files: 'java.nio.file', Paths: 'java.nio.file', Path: 'java.nio.file',
  StandardCharsets: 'java.nio.charset', Charset: 'java.nio.charset',
  Pattern: 'java.util.regex', Matcher: 'java.util.regex',
  BufferedReader: 'java.io', BufferedWriter: 'java.io', PrintWriter: 'java.io',
  FileReader: 'java.io', FileWriter: 'java.io', IOException: 'java.io',
  InputStream: 'java.io', OutputStream: 'java.io', FileInputStream: 'java.io',
  ServerSocket: 'java.net', Socket: 'java.net', URI: 'java.net', URL: 'java.net',
  HttpClient: 'java.net.http', HttpRequest: 'java.net.http', HttpResponse: 'java.net.http',
  BigDecimal: 'java.math', BigInteger: 'java.math',
  Method: 'java.lang.reflect', Field: 'java.lang.reflect',
  InvocationHandler: 'java.lang.reflect', Proxy: 'java.lang.reflect',
  Logger: 'java.util.logging', Level: 'java.util.logging',
  ElementType: 'java.lang.annotation', Retention: 'java.lang.annotation',
  RetentionPolicy: 'java.lang.annotation', Target: 'java.lang.annotation',
}

// Preview-only APIs (Java 21): need --enable-preview to compile.
const PREVIEW_APIS = ['StructuredTaskScope', 'ScopedValue']

// Fences whose compile failure is deliberate, keyed by
// "<path relative to content/>#<public top-level type>".
// Keep this small: only fences the checker actually attempts to
// compile belong here. Bare fragments (no type declaration) are a
// separate, already-counted category — intentional teaching excerpts,
// not programs — and do not need an entry.
const COMPILE_ALLOWLIST = {
  // TreeNode is defined in the first fence of this topic; the search
  // class is shown on its own for readability.
  'topics/dsa-coding/dsa/trees-graphs.md#BstSearch':
    'TreeNode is defined in an earlier fence of the same topic',
  // Java 21-24 preview API (StructuredTaskScope.ShutdownOnFailure);
  // the topic states it does not compile on JDK 25, where the API
  // was reworked (JEP 505), so on a JDK 25+ host this fence cannot
  // compile by design.
  'topics/java-advanced/concurrency/virtual-threads.md#StructuredPageLoader':
    'Java 21-24 preview API; does not compile on JDK 25 by design (topic says so)',
}

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (e.name.endsWith('.md')) out.push(p)
  }
  return out
}

function stripCommentsAndStrings(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
}

// Fences that are framework excerpts (Spring/Jakarta/JUnit/Mockito) omit
// imports by convention — the annotation or the framework type in the
// fence marks them, and the missing-import check does not apply to them.
// Only plain-Java fences (no framework marker) are checked for imports.
const FRAMEWORK_ANNOTATIONS = new Set(
  'Document Entity Embeddable Table Service Repository RestController Controller Component Configuration Bean Transactional Scheduled Async Cacheable CacheEvict PreAuthorize GetMapping PostMapping PutMapping DeleteMapping RequestMapping Test Mock SpringBootTest DataJpaTest WebMvcTest ExtendWith'.split(' '),
)
const FRAMEWORK_TYPES = new Set(
  'JpaRepository MongoRepository CrudRepository JdbcTemplate NamedParameterJdbcTemplate RestClient RestTemplate WebClient ResponseEntity MultipartFile Pageable DataSource EntityManager MockMvc Mockito Assertions MockBean MockitoBean Testcontainers RestClientException HttpServletRequest HttpServletResponse FilterChain OncePerRequestFilter HandlerInterceptor WebMvcConfigurer InterceptorRegistry CorsConfiguration CorsConfigurationSource TaskScheduler ThreadPoolTaskScheduler ThreadPoolTaskExecutor ExpressionParser SpelExpressionParser StandardEvaluationContext Health Jwts Claims'.split(' '),
)
// NOTE: 'Page' and 'Proxy' are deliberately NOT in FRAMEWORK_TYPES.
// A plain-Java record named Page (virtual-threads StructuredPageLoader)
// and java.lang.reflect.Proxy (reflection ProxyDemo) both false-positived
// as framework excerpts, so the checker never compiled them. Genuine
// Spring fences using them are still caught by their
// org.springframework.* imports or other markers above.

function isFrameworkFence(code, importPkgs) {
  if (importPkgs.some(p => !p.startsWith('java.') && !p.startsWith('static java.'))) return true
  for (const m of code.matchAll(/@(\w+)/g)) if (FRAMEWORK_ANNOTATIONS.has(m[1])) return true
  for (const t of FRAMEWORK_TYPES) if (new RegExp(`\\b${t}\\b`).test(code)) return true
  if (/Mockito\.|Assertions\.|MockMvcRequestBuilders\.|MockMvcResultMatchers\./.test(code)) return true
  return false
}

function hasJavac() {
  try {
    execFileSync('javac', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Major version of the host javac (e.g. 25 for "javac 25.0.2"),
// or null when no javac is on PATH. (javac prints its version to
// stderr, hence the 2>&1 redirect.)
function javacMajor() {
  try {
    const out = execSync('javac -version 2>&1', { encoding: 'utf8' }).trim()
    const m = out.match(/javac\s+(\d+)/)
    return m ? Number(m[1]) : null
  } catch {
    return null
  }
}

let problems = 0
let compiled = 0
let compileFailed = 0
let skippedFramework = 0
let skippedFragment = 0
const previewFences = []

const javac = hasJavac()
const hostJavacMajor = javac ? javacMajor() : null
if (!javac) {
  console.log('SKIP: no JDK found (javac not on PATH) — no compile ran; static checks only.')
}

for (const file of walk(topicsDir)) {
  const rel = path.relative(path.join(root, 'content'), file)
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  let i = 0
  while (i < lines.length) {
    if (/^```java\s*$/.test(lines[i])) {
      const start = i + 1
      let j = i + 1
      const body = []
      while (j < lines.length && !/^```\s*$/.test(lines[j])) {
        body.push(lines[j])
        j++
      }
      const src = body.join('\n')
      const code = stripCommentsAndStrings(src)
      const label = `${rel}:${start}`
      const defined = new Set([...code.matchAll(/\b(?:class|interface|enum|record)\s+(\w+)/g)].map(m => m[1]))
      if (defined.size === 0) {
        skippedFragment++
        i = j
        continue
      }

      // --- static check 1: used JDK type with no import -----------------
      // Plain-Java fences only: framework excerpts omit imports by
      // convention (see isFrameworkFence), so they are skipped here.
      const imports = new Set()
      const wildcards = new Set()
      const importPkgs = []
      for (const m of code.matchAll(/^import\s+(?:static\s+)?([\w.]+)(\.\*)?;/gm)) {
        importPkgs.push(m[1])
        if (m[2]) wildcards.add(m[1])
        else imports.add(m[1].split('.').pop())
      }
      const framework = isFrameworkFence(code, importPkgs)
      if (framework) skippedFramework++
      else {
        // Fully-qualified uses (java.util.List) need no import: drop the
        // qualified name so its last segment is not counted as "used".
        const unqualified = code.replace(/java\.[\w.]+/g, '')
        // A name after a dot (Math.PI, Level.FINE, RetentionPolicy.RUNTIME)
        // is a member, not a type: only bare identifiers count as "used".
        const used = new Set([...unqualified.matchAll(/(?<![\w.])[A-Z][A-Za-z0-9]*/g)].map(m => m[0]))
        for (const [type, pkg] of Object.entries(KNOWN)) {
          if (used.has(type) && !imports.has(type) && !defined.has(type) && !wildcards.has(pkg)) {
            console.log(`${label} MISSING IMPORT: ${type} (${pkg})`)
            problems++
          }
        }
      }

      // --- static check 2: setter on an in-fence type that lacks it ----
      // Map local/field variable -> declared type, then flag obj.setX(..)
      // when obj's type is defined in this fence but the fence declares
      // no such setter. (Inherited/Lombok setters cannot occur here:
      // snippets use plain Java, no Lombok.)
      const varType = new Map()
      for (const m of code.matchAll(/\b(?:private|protected|public)?\s*(?:static\s+)?(?:final\s+)?(\w+(?:<[^;{}()]*>)?(?:\[\])?)\s+(\w+)\s*(?:=[^;]*)?;/g)) {
        varType.set(m[2], m[1].replace(/<.*>$/, '').replace(/\[\]$/, ''))
      }
      for (const m of code.matchAll(/\(\s*(\w+)\s+(\w+)\s*[,)]/g)) varType.set(m[2], m[1])
      const declaredMethods = new Set([...code.matchAll(/(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\], ?]+\s+(\w+)\s*\(/g)].map(m => m[1]))
      for (const m of code.matchAll(/(\w+)\.set([A-Z]\w*)\s*\(/g)) {
        const type = varType.get(m[1])
        if (type && defined.has(type) && !declaredMethods.has(`set${m[2]}`)) {
          console.log(`${label} MISSING SETTER: ${m[1]}.${`set${m[2]}`}() but ${type} (defined here) declares no such setter`)
          problems++
        }
      }

      // --- compile, when possible ---------------------------------------
      // Only plain-Java fences are compilable standalone; framework
      // excerpts were already counted as skipped above.
      const publicTypes = [...code.matchAll(/^public\s+(?:final\s+|abstract\s+)?(?:class|interface|enum|record)\s+(\w+)/gm)].map(m => m[1])
      // Preview fences are named even without a JDK (previously this
      // only happened inside the compile branch, so a no-JDK run
      // wrongly reported "Preview fences: none").
      const needsPreview = PREVIEW_APIS.some(api => code.includes(api))
      if (needsPreview && publicTypes.length === 1 && !framework) previewFences.push(label)
      if (!javac) {
        i = j
        continue
      }
      if (framework) {
        i = j
        continue
      }
      if (publicTypes.length !== 1 || /^\s*package\s/m.test(code)) {
        console.log(`${label} SKIP COMPILE: needs a project layout (${publicTypes.length} public top-level types${/^\s*package\s/m.test(code) ? ', has a package' : ''})`)
        skippedFramework++
        i = j
        continue
      }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'beanstack-java-'))
      const javaFile = path.join(dir, `${publicTypes[0]}.java`)
      fs.writeFileSync(javaFile, src + '\n')
      try {
        // Preview features are only supported for the host compiler's
        // own release; everything else targets the Java 21 LTS when
        // the host supports it, and falls back to no --release flag
        // on an older host (where --release 21 would itself fail).
        const args = needsPreview
          ? ['--enable-preview', '--release', String(hostJavacMajor), javaFile]
          : hostJavacMajor !== null && hostJavacMajor >= 21
            ? ['--release', '21', javaFile]
            : [javaFile]
        execFileSync('javac', args, { stdio: 'pipe' })
        compiled++
      } catch (e) {
        const allowKey = `${rel}#${publicTypes[0]}`
        if (COMPILE_ALLOWLIST[allowKey]) {
          console.log(`${label} ALLOWED (not a failure): ${COMPILE_ALLOWLIST[allowKey]}`)
        } else {
          console.log(`${label} COMPILE FAILED:\n${(e.stdout || e.stderr || e.message || '').toString().trim()}`)
          compileFailed++
          problems++
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true })
      }
      i = j
    } else {
      i++
    }
  }
}

console.log(`\nDone: ${compiled} fence(s) compiled${javac ? '' : ' (0 — no JDK)'}${compileFailed ? `, ${compileFailed} failed` : ''}, ${skippedFragment} intentional fragments skipped, ${skippedFramework} framework/project fences skipped, ${problems} problem(s) found.`)
if (previewFences.length) console.log(`Preview fences (need --enable-preview): ${previewFences.join(', ')}`)
else console.log('Preview fences: none.')
process.exit(problems > 0 ? 1 : 0)
