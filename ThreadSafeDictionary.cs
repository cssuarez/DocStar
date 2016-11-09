using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Threading;

namespace Astria.UI.Web
{
    /// <summary>
    /// Creates a thread safe dictionairy.  We should get rid of this class. 
    /// </summary>
    /// <typeparam name="TKey"></typeparam>
    /// <typeparam name="TValue"></typeparam>
    public class ThreadSafeDictionary<TKey, TValue> : Dictionary<TKey, TValue>
    {
        private ReaderWriterLockSlim _lock = new ReaderWriterLockSlim();
        /// <summary>
        /// Gets or adds a key
        /// </summary>
        /// <param name="key"></param>
        /// <param name="defaultValue"></param>
        /// <returns></returns>
        public TValue GetOrAdd(TKey key, TValue defaultValue)
        {
            _lock.EnterReadLock();

            try
            {
                if (ContainsKey(key))
                    return this[key];
            }
            finally
            {
                _lock.ExitReadLock();
            }

            _lock.EnterWriteLock();

            try
            {
                if (!ContainsKey(key))
                {
                    Add(key, defaultValue);
                }

                return this[key];
            }
            finally
            {
                _lock.ExitWriteLock();
            }
        }

        /// <summary>
        /// gets a key out of the dictionairy
        /// </summary>
        /// <param name="key"></param>
        /// <returns></returns>
        public TValue SafeGet(TKey key)
        {
            try
            {
                _lock.EnterReadLock();

                if (!ContainsKey(key))
                    return default(TValue);

                return this[key];
            }
            finally
            {
                _lock.ExitReadLock();
            }
        }
    }
}