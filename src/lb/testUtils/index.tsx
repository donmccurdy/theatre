import StoreAndStuff from '$lb/bootstrap/StoreAndStuff'
import rootReducer from '$lb/bootstrap/rootReducer'
// import rootSaga from '$lb/bootstrap/rootSaga'
import {LBStoreState} from '$lb/types'

type Fn0<R> = (...rest: Array<void>) => Generator_<R>
type Fn1<T1, R> = (t1: T1, ...rest: Array<void>) => Generator_<R>
type Fn2<T1, T2, R> = (
  t1: T1,
  t2: T2,
  ...rest: Array<void>
) => Generator_<R>
type Fn3<T1, T2, T3, R> = (
  t1: T1,
  t2: T2,
  t3: T3,
  ...rest: Array<void>
) => Generator_<R>
type Fn4<T1, T2, T3, T4, R> = (
  t1: T1,
  t2: T2,
  t3: T3,
  t4: T4,
  ...rest: Array<void>
) => Generator_<R>
type Fn5<T1, T2, T3, T4, T5, R> = (
  t1: T1,
  t2: T2,
  t3: T3,
  t4: T4,
  t5: T5,
  ...rest: Array<void>
) => Generator_<R>
type Fn6<T1, T2, T3, T4, T5, T6, R> = (
  t1: T1,
  t2: T2,
  t3: T3,
  t4: T4,
  t5: T5,
  t6: T6,
  ...rest: Array<void>
) => Generator_<R>

type Return<R> = {
  store: StoreAndStuff<LBStoreState, any>
  task: {done: Promise<R>}
}

export type RunSingleSagaFn = (<
  T1,
  T2,
  T3,
  T4,
  T5,
  T6,
  R,
  Fn extends Fn6<T1, T2, T3, T4, T5, T6, R>
>(
  fn: Fn,
  t1: T1,
  t2: T2,
  t3: T3,
  t4: T4,
  t5: T5,
  t6: T6,
  ...rest: Array<void>
) => Return<R>) &
  (<T1, T2, T3, T4, T5, R, Fn extends Fn5<T1, T2, T3, T4, T5, R>>(
    fn: Fn,
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    t5: T5,
    ...rest: Array<void>
  ) => Return<R>) &
  (<T1, T2, T3, T4, R, Fn extends Fn4<T1, T2, T3, T4, R>>(
    fn: Fn,
    t1: T1,
    t2: T2,
    t3: T3,
    t4: T4,
    ...rest: Array<void>
  ) => Return<R>) &
  (<T1, T2, T3, R, Fn extends Fn3<T1, T2, T3, R>>(
    fn: Fn,
    t1: T1,
    t2: T2,
    t3: T3,
    ...rest: Array<void>
  ) => Return<R>) &
  (<T1, T2, R, Fn extends Fn2<T1, T2, R>>(
    fn: Fn,
    t1: T1,
    t2: T2,
    ...rest: Array<void>
  ) => Return<R>) &
  (<T1, R, Fn extends Fn1<T1, R>>(
    fn: Fn,
    t1: T1,
    ...rest: Array<void>
  ) => Return<R>) &
  (<R, Fn extends Fn0<R>>(fn: Fn, ...rest: Array<void>) => Return<R>)

export const runSingleSaga: RunSingleSagaFn = (
  customRootSaga: $IntentionalAny,
  ...args: $IntentionalAny[]
): $IntentionalAny => {
  const store = new StoreAndStuff({
    rootReducer,
    rootSaga: null as $IntentionalAny,
  })

  return {store, task: store.sagaMiddleware.run(customRootSaga, ...args)}
}
