// src/components/SearchableDropdown.js
import React, { useState, useEffect, useRef } from 'react';
import './css/SearchableDropdown.css';

const SearchableDropdown = ({ 
  value, 
  onChange, 
  onSearch, 
  options = [], 
  placeholder = "Seçiniz...",
  searchPlaceholder = "Ara...",
  disabled = false,
  loading = false,
  displayKey = "display_name",
  valueKey = "id",
  noResultsText = "Sonuç bulunamadı",
  loadOnOpen = true // Dropdown açıldığında ilk veriyi yükle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Seçili öğeyi bul
  const selectedItem = options.find(opt => opt[valueKey] === value);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropdown açıldığında search input'a focus
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search term değiştiğinde
  useEffect(() => {
    if (onSearch && isOpen && searchTerm !== '') {
      const timer = setTimeout(() => {
        onSearch(searchTerm);
        setHasSearched(true);
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [searchTerm, onSearch, isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      const newIsOpen = !isOpen;
      setIsOpen(newIsOpen);
      
      if (newIsOpen) {
        setSearchTerm('');
        setHighlightedIndex(-1);
        
        // Dropdown açıldığında ve daha önce arama yapılmamışsa ilk veriyi yükle
        if (loadOnOpen && !hasSearched && onSearch) {
          onSearch('');
          setHasSearched(true);
        }
      }
    }
  };

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`searchable-dropdown ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <div 
        className={`dropdown-toggle ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
      >
        <span className="dropdown-value">
          {selectedItem ? selectedItem[displayKey] : placeholder}
        </span>
        <span className="dropdown-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="options-container">
            {loading ? (
              <div className="option-item loading">Yükleniyor...</div>
            ) : options.length === 0 ? (
              <div className="option-item no-results">{noResultsText}</div>
            ) : (
              options.map((option, index) => (
                <div
                  key={option[valueKey]}
                  className={`option-item ${
                    option[valueKey] === value ? 'selected' : ''
                  } ${
                    index === highlightedIndex ? 'highlighted' : ''
                  }`}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className="option-name">{option[displayKey]}</span>
                  {option.email && (
                    <span className="option-meta">{option.email}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;